import os

from ..pyqgis_utils import *

def generate_layers_from_csv(map_settings: dict, map_layer, summary_csv_path: str):
    stats_layer = load_layer_file(summary_csv_path)
    join_field = map_settings['join_field']
    selected_stats = map_settings['selected_fields']
    add_to_project(stats_layer)
    
    for stat in selected_stats:
        class_attribute = f'{os.path.splitext(os.path.basename(summary_csv_path))[0]}_{stat}'
        clone = map_layer.clone()
        rename_layer(clone, suffix=f'_{stat}')
        add_to_project(clone)
        join_layers(stats_layer, clone, join_field)
        apply_default_attr_style(clone, class_attribute)