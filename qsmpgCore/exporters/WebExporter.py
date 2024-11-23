import base64
import json
import os
import shutil as sh

from qgis.core import (
    QgsVectorLayer,
    QgsJsonExporter,
)

from ..structures import Dataset

# workaround for standalone web files
def data_py_to_js(data: dict, destination_path: str, data_name: str):
    """
    Converts a Python dictionary to a JavaScript object and saves it to a file.

    Args:
        data (dict): The Python dictionary to convert.
        destination_path (str): The path where the JavaScript file will be 
            saved.
        data_name (str): The name of the JavaScript variable that will hold the 
            converted data.
    """
    json_data = json.dumps(data)
    os.makedirs(destination_path, exist_ok=True)
    with open(f'{destination_path}/{data_name}.js', 'w') as js_data_wrapper:
        if isinstance(data, dict): js_data_wrapper.write(f'var {data_name} = {json_data};')
        else: js_data_wrapper.write(f'var {data_name} = {data};')

def layer_to_geojson(layer: QgsVectorLayer) -> dict:
    """Converts a vector layer into GeoJSON"""
    exporter = QgsJsonExporter()
    return exporter.exportFeatures(layer.getFeatures())

def layer_to_base64(layer: QgsVectorLayer) -> str:
    """Converts a vector layer into base64"""
    shp_path = layer.source()
    with open(shp_path, 'rb') as shp_file:
        return base64.b64encode(shp_file.read()).decode()

def export_to_web_files(destination_path, structured_dataset: Dataset, vector_layer: QgsVectorLayer, subFolderName='Dynamic_Web_Report'):
    """Outputs all the required data for a dynamic web report.

    Args:
        destination_path (str): The path where the web report will be saved.
        structured_dataset (Dataset): The dataset to export.
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
        layer_geojson = layer_to_geojson(vector_layer)
        data_py_to_js(layer_geojson, data_destination_path, 'layer')
    # outputs all the required data for the web report
    # non filtered
    place_stats_dict = structured_dataset.place_stats_to_dict()
    data_py_to_js(place_stats_dict, data_destination_path, 'placeStats')
    season_stats_dict = structured_dataset.season_stats_to_dict()
    data_py_to_js(season_stats_dict, data_destination_path, 'seasonalStats')
    # filtered
    selected_years_place_stats_dict = structured_dataset.place_stats_to_dict('selected')
    data_py_to_js(selected_years_place_stats_dict, data_destination_path, 'selectedYearsPlaceStats')
    selected_years_season_stats_dict = structured_dataset.season_stats_to_dict('selected')
    data_py_to_js(selected_years_season_stats_dict, data_destination_path, 'selectedYearsSeasonalStats')

    properties_dict = structured_dataset.properties.__dict__
    data_py_to_js(properties_dict, data_destination_path, 'datasetProperties')
    parameters_dict = structured_dataset.parameters.__dict__
    data_py_to_js(parameters_dict, data_destination_path, 'parameters')