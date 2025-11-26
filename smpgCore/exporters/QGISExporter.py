import os

from qgis.core import (
    QgsVectorLayer,
)
from ..pyqgis_utils import *

def generate_layers_from_csv(map_layer: QgsVectorLayer, join_field: str, selected_stats: list[str], data_path_relation: dict):
    """
    Generates QGIS vector layers from a CSV file and adds them to the project.

    Args:
        map_settings (Dict[str, str]): A dictionary of settings for the export 
            process.
        map_layer (QgsVectorLayer): The layer to be used as the base for the 
            generated layers.
        summary_csv_path (str): The path to the CSV file containing the data to 
            be used for generating the layers.
    """
    selected_csv_path = data_path_relation['selected_years_summary'][1]
    climatology_csv_path = data_path_relation['climatology_summary'][1]
    climatology_years_attributes = ['C. Dk./LTA Pct.', 'C. Dk.+Forecast/LTA Pct.']

    if selected_stats != []:
        csv_selected_stats_layer = load_layer_file(selected_csv_path)
        add_to_project(csv_selected_stats_layer)
        csv_climatology_stats_layer = load_layer_file(climatology_csv_path)
        add_to_project(csv_climatology_stats_layer)
    
    for stat in selected_stats:
        map_clone = map_layer.clone()
        rename_layer(map_clone, suffix=f'_{stat}')
        add_to_project(map_clone)
        if not stat in climatology_years_attributes:
            class_attribute = f'{os.path.splitext(os.path.basename(selected_csv_path))[0]}_{stat}'
            join_layers(csv_selected_stats_layer, map_clone, join_field)
        else:
            class_attribute = f'{os.path.splitext(os.path.basename(climatology_csv_path))[0]}_{stat}'
            join_layers(csv_climatology_stats_layer, map_clone, join_field)
        apply_default_attr_style(map_clone, class_attribute)