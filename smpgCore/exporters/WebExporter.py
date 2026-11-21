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

def encode_base32768(data: bytes) -> str:
    """
    Encodes bytes as text, 15 bits per character, for data.js written in UTF-16 (base32768).

    The bits are read in 15-bit chunks, each written as the character U+0080 + its value: U+0080
    to U+807F holds no ASCII character, so none a template literal can't hold as is (`, \\, $, CR),
    and no surrogate, which UTF-16 can't hold alone. A last chunk with fewer than 8 bits of data is
    written as U+8080 + its first 7 bits instead, so its padding doesn't read as another byte.
    About 93.75% of the file is data (base64: 75%). Decoded by decodeBase32768() in the report's
    js/utils.js.

    Args:
        data (bytes): The bytes to encode.

    Returns:
        str: The encoded text, to be written in UTF-16.
    """
    bits = np.unpackbits(np.frombuffer(data, dtype=np.uint8))
    chunk_count = -(-len(bits) // 15)
    padding = chunk_count * 15 - len(bits)
    bits = np.concatenate([bits, np.zeros(padding, dtype=np.uint8)])
    code_units = 0x80 + bits.reshape(-1, 15).astype(np.int64) @ (1 << np.arange(14, -1, -1))
    if padding >= 8:
        code_units[-1] = 0x8080 + ((code_units[-1] - 0x80) >> 8)
    return code_units.astype('<u2').tobytes().decode('utf-16-le')

def compress(data: str) -> str:
    """
    Compresses string data using lzma (the .lzma "alone" format, which the
    report's lzma1 decoder reads) and encodes it as base32768 (see encode_base32768()).

    Args:
        data (str): The string data to be compressed.

    Returns:
        str: The base32768-encoded compressed data.
    """
    data_bytes = data.encode()
    # a dictionary of the smallest power of two holding the data: for data under preset 6's 8 MB
    # dictionary it compresses as well and needs less memory to decode; larger data uses all of it
    dict_size = 1 << max(12, (len(data_bytes) - 1).bit_length())
    compressed_data = lzma.compress(data_bytes, format=lzma.FORMAT_ALONE,
        filters=[{"id": lzma.FILTER_LZMA1, "preset": 6, "dict_size": dict_size}])
    return encode_base32768(compressed_data)

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
    # UTF-16 (little-endian) with a BOM, which makes browsers read it as UTF-16 even when a server
    # announces another charset; newline='' writes the text as it is on every system
    with open(f'{destination_path}/{filename}.js', 'w', encoding='utf-16-le', newline='') as js_data_wrapper:
        js_data_wrapper.write('\ufeff' + f'var report_data = `{compress(json.dumps(texts))}`;')

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
