import pandas as pd
import numpy as np
import json
import os
import shutil as sh
from ...libraries.pytopojson.pytopojson.topology import Topology
import zlib
import base64

from qgis.core import (
    QgsVectorLayer,
    QgsJsonExporter,
)

from ..structures import Dataset

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

def compress(data: str) -> str:
    """
    Compresses string data using zlib and encodes it as base64.

    Args:
        data (str): The string data to be compressed.

    Returns:
        str: A base64-encoded string representing the compressed data.
    """
    compressed_data = zlib.compress(data.encode())
    compressed_data = base64.b64encode(compressed_data).decode("ascii")
    return compressed_data

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
    vars = []
    for name, data in data_bundle.items():
        if isinstance(data, (pd.DataFrame, pd.Series)):
            vars.append(f'var {name} = `{compress(data.round(1).to_csv())}`;')
        if isinstance(data, dict):
            vars.append(f'var {name} = `{compress(json.dumps(serialize_dict(data)))}`;')

    os.makedirs(destination_path, exist_ok=True)
    with open(f'{destination_path}/{filename}.js', 'w') as js_data_wrapper:
        js_data_wrapper.write('\n\n'.join(vars))

def layer_to_topojson(layer: QgsVectorLayer) -> dict:
    """Converts a vector layer into GeoJSON"""
    exporter = QgsJsonExporter()
    geojson: dict = json.loads(exporter.exportFeatures(layer.getFeatures()))
    return Topology()({'map': geojson}, 1e4)

def export_to_web_files(destination_path, vector_layer: QgsVectorLayer, subFolderName, structured_dataset: Dataset, ):
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

    # makes subfolder for data
    data_destination_path = os.path.join(web_subfolder_path, 'data')
    os.makedirs(data_destination_path, exist_ok=True)

    # layer as geojson
    if vector_layer is not None:
        layer_topojson = layer_to_topojson(vector_layer)
        data_py_to_js({'topojson_map': layer_topojson}, data_destination_path, 'topojson_map')
    # outputs all the required data for the web report

    places = structured_dataset.places
    
    properties = {
        'datasetProperties': structured_dataset.properties.__dict__,
        'parameters': structured_dataset.parameters.__dict__,
    }
    data_py_to_js(properties, data_destination_path, 'properties')

    general_stats = {
        'place_general_stats_csv': pd.DataFrame(
        [p.place_general_stats for p in places.values()]),
        'place_long_term_stats_csv_obj': {k:v.place_long_term_stats for k, v in places.items()},
        'seasonal_current_totals_csv': pd.DataFrame(
        [p.seasonal_current_totals for p in places.values()]),
        'seasonal_general_stats_csv': pd.DataFrame(
        [p.seasonal_general_stats for p in places.values()]),
        'selected_seasons_general_stats_csv': pd.DataFrame(
        [p.selected_seasons_general_stats for p in places.values()]),
    }
    data_py_to_js(general_stats, data_destination_path, 'general_stats')

    seasonal_stats = {
        'seasonal_cumsum_csv_obj': {k:v.seasonal_cumsum for k, v in places.items()},
        'seasonal_ensemble_csv_obj': {k:v.seasonal_ensemble for k, v in places.items()},
        'seasonal_long_term_stats_csv_obj': {k:v.seasonal_long_term_stats for k, v in places.items()},
    }
    data_py_to_js(seasonal_stats, data_destination_path, 'seasonal_stats')

    selected_seasons_stats = {
        'selected_seasons_cumsum_csv_obj': {k:v.selected_seasons_cumsum for k, v in places.items()},
        'selected_seasons_ensemble_csv_obj': {k:v.selected_seasons_ensemble for k, v in places.items()},
        'selected_seasons_long_term_stats_csv_obj': {k:v.selected_seasons_long_term_stats for k, v in places.items()},
    }
    data_py_to_js(selected_seasons_stats, data_destination_path, 'selected_seasons_stats')
