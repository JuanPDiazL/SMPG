import os

from ..pyqgis_utils import *

def generate_layers_from_csv(map_layer, join_field: str, selected_stats: list[str], summary_csv_path: str):
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
    stats_layer = load_layer_file(summary_csv_path)
    add_to_project(stats_layer)
    
    for stat in selected_stats:
        class_attribute = f'{os.path.splitext(os.path.basename(summary_csv_path))[0]}_{stat}'
        clone = map_layer.clone()
        rename_layer(clone, suffix=f'_{stat}')
        add_to_project(clone)
        join_layers(stats_layer, clone, join_field)
        apply_default_attr_style(clone, class_attribute)