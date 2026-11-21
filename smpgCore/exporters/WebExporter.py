import pandas as pd
import numpy as np
import json
import os
import shutil as sh
import io
import zipfile
from typing import List, Optional
from .TopoJSONBuilder import geojson_to_topojson, simplify_topojson
import lzma

from qgis.core import (
    QgsVectorLayer,
    QgsJsonExporter,
)

from ..structures import Dataset
from ..pyqgis_utils import simplify_lines, find_broken_places

# The web map's coordinates are rounded to a grid of 1/MAP_QUANTIZATION of the map's extent (about
# 10 m on Kenya, 45 m on the Sahel per step): under a pixel at the map's largest zoom on maps of
# km-sized places, and the encoded map is about half as large. Slivers may collapse to nothing or
# flip their winding; the report rewinds them (rewindInvertedPolygons() in js/makeMap.js).
MAP_QUANTIZATION = 1e5

# The map's borders are then simplified by at most this many pixels at each place's own zoom (see
# simplify_topojson()): not visible, and the encoded map gets 25-75% smaller on the sample maps
MAP_SIMPLIFY_MAX_SHIFT_PX = 0.5

# data.js holds a Zarr v2 store (in a zip): every numeric table as an array of int32 tenths (see
# table_to_tenths()), this value marking its empty cells, and the other variables in texts.json
ZARR_FILL_VALUE = -2**31

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

def compress(data: bytes) -> str:
    """
    Compresses data using lzma (the .lzma "alone" format, which the report's lzma1 decoder reads)
    and encodes it as base32768 (see encode_base32768()).

    Args:
        data (bytes): The data to be compressed.

    Returns:
        str: The base32768-encoded compressed data.
    """
    # a dictionary of the smallest power of two holding the data: for data under preset 6's 8 MB
    # dictionary it compresses as well and needs less memory to decode; larger data uses all of it
    dict_size = 1 << max(12, (len(data) - 1).bit_length())
    compressed_data = lzma.compress(data, format=lzma.FORMAT_ALONE,
        filters=[{"id": lzma.FILTER_LZMA1, "preset": 6, "dict_size": dict_size}])
    return encode_base32768(compressed_data)

def table_to_tenths(table: pd.DataFrame) -> Optional[np.ndarray]:
    """
    The table's values, rounded to 0.1 as the report shows them, as int32 tenths with
    ZARR_FILL_VALUE for empty cells; tenths / 10 in the report gives the very number its CSV did.

    Args:
        table (DataFrame): The table.

    Returns:
        ndarray | None: The int32 tenths, or None when they can't stand for the CSV exactly (text,
            booleans, infinite or -0.0 values, values beyond int32): the table then stays CSV.
    """
    for column in table.columns[table.dtypes == object]:
        # object columns may hold numbers and None (empty), nothing else
        if not all(value is None or (isinstance(value, (int, float, np.integer, np.floating))
                                     and not isinstance(value, (bool, np.bool_)))
                   for value in table[column]):
            return None
    if any(pd.api.types.is_bool_dtype(dtype) for dtype in table.dtypes):
        return None
    try:
        values = table.round(1).to_numpy(dtype=float)
    except (TypeError, ValueError):
        return None
    return rounded_to_tenths(values)

def tables_to_tenths(tables: List[pd.DataFrame]) -> Optional[np.ndarray]:
    """
    The tables' values as table_to_tenths() gives them, stacked (one table per first index). Tables
    of float and integer columns only are converted together, much faster than one by one.

    Args:
        tables (list[DataFrame]): Tables of the same shape.

    Returns:
        ndarray | None: The stacked int32 tenths, or None when a table must stay CSV.
    """
    if all(pd.api.types.is_float_dtype(dtype)
           or (pd.api.types.is_integer_dtype(dtype) and not pd.api.types.is_bool_dtype(dtype))
           for table in tables for dtype in table.dtypes):
        # np.round is what DataFrame.round() applies to each column
        return rounded_to_tenths(np.round(np.stack([table.to_numpy(dtype=float) for table in tables]), 1))
    place_values = [table_to_tenths(table) for table in tables]
    if any(values is None for values in place_values):
        return None
    return np.stack(place_values)

def rounded_to_tenths(values: np.ndarray) -> Optional[np.ndarray]:
    """
    Values rounded to 0.1 as int32 tenths, ZARR_FILL_VALUE for NaN (empty cells).

    Args:
        values (ndarray): The rounded values (float).

    Returns:
        ndarray | None: The int32 tenths, or None when a value can't be read back exactly as tenths
            / 10 (infinite, -0.0, not a whole number of tenths, beyond int32).
    """
    filled = ~np.isnan(values)
    tenths = np.rint(values * 10)
    if (not np.isfinite(values[filled]).all()
            or (tenths[filled] / 10 != values[filled]).any()
            or ((values[filled] == 0) & np.signbit(values[filled])).any()
            or (np.abs(tenths[filled]) > 2**31 - 2).any()):
        return None
    tenths[~filled] = ZARR_FILL_VALUE
    return tenths.astype('<i4')

def write_zarr_array(store: zipfile.ZipFile, name: str, values: np.ndarray, attributes: dict):
    """
    Writes an int32 array to a Zarr v2 store: one chunk, no compressor (data.js is compressed as a
    whole), the standard byte shuffle filter (all first bytes, then all second bytes...).

    Args:
        store (ZipFile): The store.
        name (str): The array's name (its folder in the store).
        values (ndarray): The int32 values.
        attributes (dict): Its .zattrs.
    """
    metadata = {'zarr_format': 2, 'shape': list(values.shape), 'chunks': list(values.shape),
                'dtype': '<i4', 'compressor': None, 'fill_value': ZARR_FILL_VALUE, 'order': 'C',
                'filters': [{'id': 'shuffle', 'elementsize': 4}]}
    planes = np.ascontiguousarray(values, dtype='<i4').view(np.uint8).reshape(-1, 4).T
    write_zip_entry(store, f'{name}/.zarray', json.dumps(metadata).encode())
    write_zip_entry(store, f'{name}/.zattrs', json.dumps(attributes).encode())
    write_zip_entry(store, f'{name}/' + '.'.join('0' * values.ndim), planes.tobytes())

def write_zip_entry(store: zipfile.ZipFile, name: str, data: bytes):
    """Writes an uncompressed entry with a fixed date, so the same data gives the same bytes."""
    store.writestr(zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0)), data,
                   compress_type=zipfile.ZIP_STORED)

def numeric_table_array(name: str, data) -> Optional[tuple]:
    """
    A numeric variable as a Zarr array: a table of places (DataFrame) in 2 dimensions, a table per
    place (dict of DataFrames with the same columns and number of rows) in 3.

    Args:
        name (str): The variable's name.
        data (DataFrame | dict): Its value.

    Returns:
        tuple | None: (values, attributes) for write_zarr_array(), or None when it stays CSV.
    """
    attributes = {'scale_factor': 0.1, '_FillValue': ZARR_FILL_VALUE}
    if isinstance(data, pd.DataFrame):
        # read with csvParse() or csvParseRows(): the index must be unnamed, the columns unique
        values = table_to_tenths(data)
        if (values is None or values.size == 0 or data.index.name is not None
                or not data.columns.is_unique):
            return None
        return values, {**attributes, '_ARRAY_DIMENSIONS': ['place', f'{name}_columns'],
                        'rows': [str(label) for label in data.index],
                        'columns': [str(label) for label in data.columns]}
    if isinstance(data, dict) and data and all(isinstance(table, pd.DataFrame) for table in data.values()):
        tables = list(data.values())
        columns = [str(label) for label in tables[0].columns]
        if any([str(label) for label in table.columns] != columns or len(table) != len(tables[0])
               for table in tables):
            return None
        values = tables_to_tenths(tables)
        if values is None or values.size == 0:
            return None
        rows = [[str(label) for label in table.index] for table in tables]
        return values, {
            **attributes, '_ARRAY_DIMENSIONS': ['place', f'{name}_rows', f'{name}_columns'],
            'places': [str(place) for place in data],
            # one list when every place has the same rows, else one per place (e.g. similar years)
            'rows': rows[0] if all(place_rows == rows[0] for place_rows in rows) else rows,
            'columns': columns}
    return None

def data_py_to_js(data_bundle: dict, destination_path: str, filename: str):
    '''Convert a dictionary of Python objects to JavaScript code.

    The data goes into a Zarr v2 store (a zip): every numeric table as an int32 array (see
    numeric_table_array()), the other variables (JSON, the map, tables that must stay CSV) as text
    in its texts.json. The store is compressed and encoded into one JavaScript variable,
    report_data, which the report reads with readReportData() (js/utils.js).

    Args:
        data_bundle (dict): A dictionary where each key is a variable name and each value
                             is a Python object to be converted to JavaScript.
        destination_path (str): The path where the generated JavaScript file will be saved.
        filename (str): The name of the JavaScript file that will be generated.
    '''
    # all variables compressed together: one blob lets lzma find the repeats between them. The
    # values that are neither tables nor dictionaries (e.g. a missing map's None) are left out, so
    # the report leaves them undeclared
    texts = {}
    store_buffer = io.BytesIO()
    with zipfile.ZipFile(store_buffer, 'w', zipfile.ZIP_STORED) as store:
        write_zip_entry(store, '.zgroup', json.dumps({'zarr_format': 2}).encode())
        for name, data in data_bundle.items():
            array = numeric_table_array(name, data) if name.endswith(('_csv', '_csv_obj')) else None
            if array is not None:
                write_zarr_array(store, name, *array)
            elif isinstance(data, (pd.DataFrame, pd.Series)):
                texts[name] = data.round(1).to_csv()
            elif isinstance(data, dict):
                texts[name] = json.dumps(serialize_dict(data))
        write_zip_entry(store, 'texts.json', json.dumps(texts).encode())

    os.makedirs(destination_path, exist_ok=True)
    # UTF-16 (little-endian) with a BOM, which makes browsers read it as UTF-16 even when a server
    # announces another charset; newline='' writes the text as it is on every system
    with open(f'{destination_path}/{filename}.js', 'w', encoding='utf-16-le', newline='') as js_data_wrapper:
        js_data_wrapper.write('\ufeff' + f'var report_data = `{compress(store_buffer.getvalue())}`;')

def layer_to_topojson(layer: QgsVectorLayer) -> dict:
    """Converts a vector layer into quantized, simplified TopoJSON (see MAP_QUANTIZATION and
    MAP_SIMPLIFY_MAX_SHIFT_PX)"""
    exporter = QgsJsonExporter()
    geojson: dict = json.loads(exporter.exportFeatures(layer.getFeatures()))
    return simplify_topojson(geojson_to_topojson(geojson, MAP_QUANTIZATION), MAP_SIMPLIFY_MAX_SHIFT_PX,
                             simplify_lines, find_broken_places)

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
