import pandas as pd
import numpy as np
import json
import os
import shutil as sh
from .TopoJSONBuilder import geojson_to_topojson
import lzma

from qgis.core import (
    QgsVectorLayer,
    QgsJsonExporter,
)

from ..structures import Dataset

# The web map's coordinates are rounded to a grid of 1/MAP_QUANTIZATION of the map's extent (about
# 10 m on Kenya, 45 m on the Sahel per step): under a pixel at the map's largest zoom on maps of
# km-sized places, and the encoded map is about half as large. Slivers may collapse to nothing or
# flip their winding; the report rewinds them (rewindInvertedPolygons() in js/makeMap.js).
MAP_QUANTIZATION = 1e5

# The characters base122 doesn't write as is in data.js's template literal (see encode_base122()):
# NUL, CR (read as LF in a template literal), $ (${ starts a substitution), \ and `
BASE122_BANNED = (0x00, 0x0D, 0x24, 0x5C, 0x60)

def serialize_dict(input_dict: dict):
    '''Recursively serializes a dictionary and its nested dictionaries to a flattened format.

    Args:
        input_dict (dict): The dictionary to be serialized.

    Returns:
        dict: the serializable dictionary.
    '''
    serialized_dict = {}
    for key, value in input_dict.items():
        if isinstance(value, np.ndarray):
            serialized_dict[key] = value.round(1).tolist()
        elif isinstance(value, (pd.DataFrame, pd.Series)):
            serialized_dict[key] = f'{value.round(1).to_csv()}'
        elif isinstance(value, dict):
            serialized_dict[key] = serialize_dict(value)
        else:
            serialized_dict[key] = value
    return serialized_dict

def encode_base122(data: bytes) -> str:
    """
    Encodes bytes as text for a JavaScript template literal, 7 bits per character (base122).

    The bits are read in 7-bit chunks, each written as the ASCII character of that value, except
    the values a template literal can't hold as is (BASE122_BANNED): such a chunk and the next one
    are written together as one character, U+0080 + (its index in BASE122_BANNED * 128 + the next
    chunk), two bytes in UTF-8; a banned last chunk uses index len(BASE122_BANNED). About 87.5%
    of the file is data (base64: 75%). Decoded by decodeBase122() in the report's js/utils.js.

    Args:
        data (bytes): The bytes to encode.

    Returns:
        str: The encoded text (UTF-8 to be written as such).
    """
    bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8))
    chunk_count = -(-len(bits) // 7)
    bits = np.concatenate([bits, np.zeros(chunk_count * 7 - len(bits), dtype=np.uint8)])
    chunks = bits.reshape(-1, 7).astype(np.int64) @ (1 << np.arange(6, -1, -1))

    banned_index = np.full(128, -1, dtype=np.int64)
    banned_index[list(BASE122_BANNED)] = np.arange(len(BASE122_BANNED))
    code_points = chunks.copy()
    is_kept = np.ones(chunk_count, dtype=bool)
    # in order: a banned chunk takes the next one with it, and a taken chunk isn't checked
    taken = -1
    for i in np.flatnonzero(banned_index[chunks] >= 0).tolist():
        if i == taken:
            continue
        if i + 1 < chunk_count:
            code_points[i] = 0x80 + (banned_index[chunks[i]] << 7) + chunks[i + 1]
            is_kept[i + 1] = False
            taken = i + 1
        else:
            code_points[i] = 0x80 + (len(BASE122_BANNED) << 7) + chunks[i]
    return code_points[is_kept].astype('<u4').tobytes().decode('utf-32-le')

def compress(data: str) -> str:
    """
    Compresses string data using lzma (the .lzma "alone" format, which the
    report's lzma1 decoder reads) and encodes it as base122 (see encode_base122()).

    Args:
        data (str): The string data to be compressed.

    Returns:
        str: The base122-encoded compressed data.
    """
    data_bytes = data.encode()
    # a dictionary of the smallest power of two holding the data: for data under preset 6's 8 MB
    # dictionary it compresses as well and needs less memory to decode; larger data uses all of it
    dict_size = 1 << max(12, (len(data_bytes) - 1).bit_length())
    compressed_data = lzma.compress(data_bytes, format=lzma.FORMAT_ALONE,
        filters=[{"id": lzma.FILTER_LZMA1, "preset": 6, "dict_size": dict_size}])
    return encode_base122(compressed_data)

def data_py_to_js(data_bundle: dict, destination_path: str, filename: str):
    '''Convert a dictionary of Python objects to JavaScript code.

    This function takes a dictionary of Python objects (e.g. DataFrames, dictionaries)
    and generates JavaScript code that can be used to recreate the original data in a web page.

    Args:
        data_bundle (dict): A dictionary where each key is a variable name and each value
                             is a Python object to be converted to JavaScript.
        destination_path (str): The path where the generated JavaScript file will be saved.
        filename (str): The name of the JavaScript file that will be generated.
    '''
    # each variable's text (CSV or JSON), compressed together: one blob lets lzma find the
    # repeats between variables. The report declares each item as a global variable (main.js);
    # the other values (e.g. a missing map's None) are left out, so they stay undeclared
    texts = {}
    for name, data in data_bundle.items():
        if isinstance(data, (pd.DataFrame, pd.Series)):
            texts[name] = data.round(1).to_csv()
        if isinstance(data, dict):
            texts[name] = json.dumps(serialize_dict(data))

    os.makedirs(destination_path, exist_ok=True)
    # UTF-8 with a BOM, which makes browsers read it as UTF-8 even when a server announces another
    # charset; newline='' keeps the encoded text's line feeds as they are (no CR on Windows)
    with open(f'{destination_path}/{filename}.js', 'w', encoding='utf-8-sig', newline='') as js_data_wrapper:
        js_data_wrapper.write(f'var report_data = `{compress(json.dumps(texts))}`;')

def layer_to_topojson(layer: QgsVectorLayer) -> dict:
    """Converts a vector layer into quantized TopoJSON (see MAP_QUANTIZATION)"""
    exporter = QgsJsonExporter()
    geojson: dict = json.loads(exporter.exportFeatures(layer.getFeatures()))
    return geojson_to_topojson(geojson, MAP_QUANTIZATION)

def export_to_web_files(destination_path, map_layer: QgsVectorLayer, reference_layer: QgsVectorLayer, subFolderName, structured_dataset: Dataset, ):
    """Outputs all the required data for a dynamic web report.

    Args:
        destination_path (str): The path where the web report will be saved.
        structured_dataset (Dataset): The dataset to export.
        vector_layer (QgsVectorLayer): The vector layer to export to the web report.
        subFolderName (str, optional): The name of the subfolder that will hold 
            the web report. Defaults to 'Dynamic_Web_Report'.
    """

    # Create the destination folder if it doesn't exist
    web_subfolder_path = os.path.join(destination_path, subFolderName)
    os.makedirs(web_subfolder_path, exist_ok=True)
    
    # copy web template 
    source_folder = os.path.join(os.path.dirname(__file__), '..', 'res', 'web_template')
    sh.copytree(source_folder, web_subfolder_path, dirs_exist_ok=True)
    # the template is made for a report without a forecast; otherwise some of its files (its
    # layout) are replaced by the ones made for the report's case. Without a current season there
    # is no forecast either.
    override = None
    if structured_dataset.parameters.ignore_current_season:
        override = 'ignoreCurrentSeason'
    elif structured_dataset.parameters.forecast_length > 0:
        override = 'hasForecast'
    if override is not None:
        override_folder = os.path.join(os.path.dirname(__file__), '..', 'res', 'web_template_overrides', override)
        sh.copytree(override_folder, web_subfolder_path, dirs_exist_ok=True)

    # makes subfolder for data
    data_destination_path = os.path.join(web_subfolder_path, 'data')
    os.makedirs(data_destination_path, exist_ok=True)

    # layer as geojson
    topojson_dict = {'topojson_map': None, 'reference_topojson_map': None}
    if map_layer is not None:
        topojson_dict['topojson_map'] = layer_to_topojson(map_layer)
    if reference_layer is not None:
        reference_topojson = layer_to_topojson(reference_layer)
        # a reference identical to the map isn't exported: the report then draws the map's
        if reference_topojson != topojson_dict['topojson_map']:
            topojson_dict['reference_topojson_map'] = reference_topojson
    
    # outputs all the required data for the web report
    places = structured_dataset.places
    
    properties = {
        'dataset_properties_json': structured_dataset.properties.__dict__,
        'parameters_json': structured_dataset.parameters.__dict__,
    }

    general_stats = {
        'place_general_stats_csv': pd.DataFrame(
        [p.place_general_stats for p in places.values()]),
        'place_long_term_stats_csv_obj': {k:v.place_long_term_stats for k, v in places.items()},
        'seasonal_current_totals_csv': pd.DataFrame(
        [p.seasonal_sums_upto_current for p in places.values()]),
        'seasonal_pct_of_avg_csv': pd.DataFrame(
        [p.seasonal_pct_of_avg_upto_current for p in places.values()]),
        'seasonal_forecast_totals_csv': pd.DataFrame(
        [p.seasonal_sums_upto_forecast for p in places.values()]),
        'seasonal_general_stats_csv': pd.DataFrame(
        [p.seasonal_general_stats for p in places.values()]),
        'selected_seasons_general_stats_csv': pd.DataFrame(
        [p.selected_seasons_general_stats for p in places.values()]),
    }

    seasonal_stats = {
        'seasonal_cumsum_csv_obj': {k:v.seasonal_cumsum for k, v in places.items()},
        'seasonal_ensemble_csv_obj': {k:v.seasons_ensemble for k, v in places.items()},
        'seasonal_long_term_stats_csv_obj': {k:v.seasonal_long_term_stats for k, v in places.items()},
        'seasonal_series_csv_obj': {k:v.season_df for k, v in places.items()},
    }

    selected_seasons_stats = {
        'selected_seasons_cumsum_csv_obj': {k:v.selected_seasons_cumsum for k, v in places.items()},
        'selected_seasons_ensemble_csv_obj': {k:v.selected_seasons_ensemble for k, v in places.items()},
        'selected_seasons_ensemble_with_forecast_csv_obj': {k:v.selected_seasons_ensemble_with_forecast for k, v in places.items()},
        'selected_seasons_long_term_stats_csv_obj': {k:v.selected_seasons_long_term_stats for k, v in places.items()},
    }

    # all the report's data in one file (the layout stays in its own, layout.js)
    data_py_to_js({**topojson_dict, **properties, **general_stats, **seasonal_stats, **selected_seasons_stats},
                  data_destination_path, 'data')
