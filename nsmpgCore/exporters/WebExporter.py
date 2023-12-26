import json
import os
import shutil as sh
from ..commons import define_seasonal_dict
from ..structures import Dataset

def data_py_to_js(data: dict, destination_path: str, data_name: str):
    os.makedirs(destination_path, exist_ok=True)
    with open(f'{destination_path}/{data_name}.js', 'w') as js_data_wrapper:
        if isinstance(data, dict): js_data_wrapper.write(f'var {data_name} = {json.dumps(data)};')
        else: js_data_wrapper.write(f'var {data_name} = {data};')

def export_to_web_files(destination_path, structured_dataset: Dataset):
    source_folder = os.path.join(os.path.dirname(__file__), '..', 'res', 'web_template')

    # Create the destination folder if it doesn't exist
    web_subfolder_path = os.path.join(destination_path, 'Dynamic_Web_Report')
    os.makedirs(web_subfolder_path, exist_ok=True)
    
    sh.copytree(source_folder, web_subfolder_path, dirs_exist_ok=True)

    data_destination_path = os.path.join(web_subfolder_path, 'data')
    os.makedirs(data_destination_path, exist_ok=True)

    structured_dict = structured_dataset.raw_to_dict()
    data_py_to_js(structured_dict, data_destination_path, 'rawData')

    stats_dict = structured_dataset.place_stats_to_dict()
    data_py_to_js(stats_dict, data_destination_path, 'placeStats')

    stats_dict = structured_dataset.season_stats_to_dict()
    data_py_to_js(stats_dict, data_destination_path, 'seasonalStats')

    seasonal_cols = list(list(structured_dataset.get_children().values())[0].get_children().keys())
    data_py_to_js(seasonal_cols, data_destination_path, 'seasonCols')

    data_py_to_js(define_seasonal_dict(), data_destination_path, 'subSeasonCols')