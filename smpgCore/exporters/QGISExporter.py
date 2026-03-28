import os

from qgis.core import (
    QgsVectorLayer,
)

from ..pyqgis_utils import *
from ..utils import Properties

styles = {
    "prob_below_normal": {
        "type": "graduated",
        "legend": {
            "\u226415": {"color": "#2b83ba", "values": [0, 15]},
            "15 - 30": {"color": "#74b7ae", "values": [15, 30]},
            "30 - 45": {"color": "#e7f6b8", "values": [30, 45]},
            "45 - 60": {"color": "#ffe8a4", "values": [45, 60]},
            "60 - 75": {"color": "#feba6e", "values": [60, 75]},
            "75 - 90": {"color": "#ed6e43", "values": [75, 90]},
            "≥90": {"color": "#d7191c", "values": [90, 100]},
        },
    },
    "prob_above_normal": {
        "type": "graduated",
        "legend": {
            "\u226420": {"color": "#e6e6e6", "values": [0, 20]},
            "20 - 40": {"color": "#f0f9e8", "values": [20, 40]},
            "40 - 60": {"color": "#bae4bc", "values": [40, 60]},
            "60 - 80": {"color": "#7bccc4", "values": [60, 80]},
            "80 - 90": {"color": "#43a2ca", "values": [80, 90]},
            "\u226590": {"color": "#0868ac", "values": [90, 100]},
        },
    },
    "anomaly_percent": {
        "type": "graduated",
        "legend": {
            "\u226420": {"color": "#be6b05", "values": [0, 20]},
            "20 - 40": {"color": "#f38124", "values": [20, 40]},
            "40 - 60": {"color": "#fec280", "values": [40, 60]},
            "60 - 80": {"color": "#ffe69e", "values": [60, 80]},
            "80 - 90": {"color": "#fff9a3", "values": [80, 90]},
            "90 - 110": {"color": "#f2f2f2", "values": [90, 110]},
            "110 - 120": {"color": "#c6eab3", "values": [110, 120]},
            "120 - 140": {"color": "#56cd94", "values": [120, 140]},
            "140 - 160": {"color": "#5cc9ea", "values": [140, 160]},
            "\u2265160": {"color": "#2a83ba", "values": [160, 9999]},
        },
    },
    "precipitation_percentile": {
        "type": "graduated",
        "legend": {
            "\u22643 Exceptional Drought": {"color": "#7e0006", "values": [0, 3]},
            "3 - 6 Extreme Drought": {"color": "#e20b00", "values": [3, 6]},
            "6 - 11 Severe Drought": {"color": "#e35a1a", "values": [6, 11]},
            "11 - 21 Moderate Drought": {"color": "#faaf00", "values": [11, 21]},
            "21 - 33 Abnormally Dry": {"color": "#faff0f", "values": [21, 33]},
            "33 - 67  Normal ": {"color": "#f2f2f2", "values": [33, 67]},
            "67 - 90 Wetter than Normal": {"color": "#a6cee3", "values": [67, 90]},
            "\u226590 Extremely Wet": {"color": "#1f78b4", "values": [90, 100]},
        },
    },
    "sos_eos_detection_base": {
        "type": "categorized",
        "legend": {
            "No Start": {"color": "#fff77d", "values": ["No Start"]},
            "Possible Start": {"color": "#dfd75d", "values": ["Possible Start"]},
            "\u2264Feb-1": {"color": "#6e00c9", "values": ["≤Feb-1"]},
            "Feb-2": {"color": "#bf4fe0", "values": ["Feb-2"]},
            "Feb-3": {"color": "#e3adf5", "values": ["Feb-3"]},
            "Mar-1": {"color": "#0094ad", "values": ["Mar-1"]},
            "Mar-2": {"color": "#21d6ff", "values": ["Mar-2"]},
            "Mar-3": {"color": "#8cf2ff", "values": ["Mar-3"]},
            "Apr-1": {"color": "#00bd2e", "values": ["Apr-1"]},
            "Apr-2": {"color": "#a1ff96", "values": ["Apr-2"]},
            "Apr-3": {"color": "#a3ffcc", "values": ["Apr-3"]},
            "May-1": {"color": "#f07500", "values": ["May-1"]},
            "May-2": {"color": "#ff9126", "values": ["May-2"]},
            "May-3": {"color": "#ffb8ab", "values": ["May-3"]},
            "Jun-1": {"color": "#004da8", "values": ["Jun-1"]},
            "Jun-2": {"color": "#005ce6", "values": ["Jun-2"]},
            "Jun-3": {"color": "#0070ff", "values": ["Jun-3"]},
            "Jul-1": {"color": "#f7e8cc", "values": ["Jul-1"]},
            "Jul-2": {"color": "#e6c996", "values": ["Jul-2"]},
            "Jul-3": {"color": "#cfa836", "values": ["Jul-3"]},
            "\u2265Aug-1": {"color": "#966300", "values": ["≥Aug-1"]},
        },
    },
    "sos_eos_anomaly": {
        "type": "categorized",
        "legend": {
            "Yet to Start": {"color": "#fff77d", "values": ["Yet to Start"]},
            "\u22654 Dekads Early": {"color": "#004280", "values": ["≤4 Dekads Early"]},
            "3 Dekads Early": {"color": "#0073f0", "values": ["3 Dekads Early"]},
            "2 Dekads Early": {"color": "#008ff5", "values": ["2 Dekads Early"]},
            "1 Dekads Early": {"color": "#00a6f5", "values": ["1 Dekads Early"]},
            "Average": {"color": "#cccccc", "values": ["Average"]},
            "1 Dekads Late": {"color": "#ffd4e6", "values": ["1 Dekads Late"]},
            "2 Dekads Late": {"color": "#ffc78f", "values": ["2 Dekads Late"]},
            "3 Dekads Late": {"color": "#ff734a", "values": ["3 Dekads Late"]},
            "\u22654 Dekads Late": {"color": "#ba0070", "values": ["≥4 Dekads Late"]},
        },
    },
}

def generate_layers_from_csv(map_layer: QgsVectorLayer, join_field: str, selected_stats: list[str], data_path_relation: dict, dataset_properties: Properties):
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
    
    if selected_stats == []: return
    
    attribute_style_relation = {
        'Total up to Current Season/LTA Pct.': {'classes': 'anomaly_percent', 'data': 'climatology_stats'},
        'Total up to Forecast/LTA Pct.': {'classes': 'anomaly_percent', 'data': 'climatology_stats'},
        'Ensemble Med./LTA Pct.': {'classes': 'anomaly_percent', 'data': 'selected_years_stats'},
        'Ensemble Med. w Forecast/LTA Pct.': {'classes': 'anomaly_percent', 'data': 'selected_years_stats'},
        'Probability Below Normal': {'classes': 'prob_below_normal', 'data': 'selected_years_stats'},
        'Probability of Normal': {'classes': 'prob_above_normal', 'data': 'selected_years_stats'},
        'Probability Above Normal': {'classes': 'prob_above_normal', 'data': 'selected_years_stats'},
        'Ensemble Med. Pctl.': {'classes': 'precipitation_percentile', 'data': 'selected_years_stats'},
        'Ensemble Med. Pctl. w/ Forecast': {'classes': 'precipitation_percentile', 'data': 'selected_years_stats'},
        'Current Season Pctl.': {'classes': 'precipitation_percentile', 'data': 'general_stats'},
        'Start of Season': {'classes': 'sos_eos_detection', 'data': 'general_stats'},
        'Start of Season Anomaly': {'classes': 'sos_eos_anomaly', 'data': 'general_stats'},
        'Forecast Start of Season': {'classes': 'sos_eos_detection', 'data': 'general_stats'},
        'Forecast Start of Season Anomaly': {'classes': 'sos_eos_anomaly', 'data': 'general_stats'},
    }

    # Read CSV files
    data = {}
    for key, value in data_path_relation.items():
        item = {'path': value[1], 'layer': load_layer_file(value[1])}
        add_to_project(item["layer"])
        data[key] = item
    
    # Legend for SoS and EOS
    base_sos = list(styles["sos_eos_detection_base"]["legend"].values())[2:] # variable part of the sos legend
    monitoring_ids = dataset_properties.sub_season_monitoring_ids
    size_legend = min(len(base_sos), len(monitoring_ids))
    sos_variable_legend = zip(monitoring_ids, base_sos)
    sos_eos_style = {"type": "categorized", "legend": 
        {"No Start": {"color": "#fff77d", "values": ["No Start"]},
        "Possible Start": {"color": "#dfd75d", "values": ["Possible Start"]}}}
    for i, (id, legend) in enumerate(sos_variable_legend):
        if i+1 == size_legend and size_legend < len(monitoring_ids):
            id = f"\u2265{id}"
        sos_eos_style["legend"][id] = legend
        sos_eos_style["legend"][id]["values"][0] = id
    styles["sos_eos_detection"] = sos_eos_style
    
    # Create vector layers
    for stat in selected_stats:
        map_clone = map_layer.clone()
        rename_layer(map_clone, suffix=f'_{stat}')
        add_to_project(map_clone)
        class_attribute = f'{os.path.splitext(os.path.basename(data[attribute_style_relation[stat]["data"]]["path"]))[0]}_{stat}'
        join_layers(data[attribute_style_relation[stat]['data']]['layer'], map_clone, join_field)
        
        classes = styles[attribute_style_relation[stat]['classes']]
        apply_symbology(map_clone, class_attribute, classes)