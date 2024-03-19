import json
import os
import shutil as sh
from ..commons import define_seasonal_dict
from ..structures import Dataset

# converts dict to javascript object. workaround for standalone web files
def data_py_to_js(data: dict, destination_path: str, data_name: str):
    os.makedirs(destination_path, exist_ok=True)
    with open(f'{destination_path}/{data_name}.js', 'w') as js_data_wrapper:
        if isinstance(data, dict): js_data_wrapper.write(f'var {data_name} = {json.dumps(data, indent=4)};')
        else: js_data_wrapper.write(f'var {data_name} = {data};')

# outputs all the required data for a dynamic web report.
def export_to_web_files(destination_path, structured_dataset: Dataset, filtered_climatology: Dataset,
                        filtered_monitoring: Dataset, filtered_all: Dataset, subFolderName='Dynamic_Web_Report'):
    source_folder = os.path.join(os.path.dirname(__file__), '..', 'res', 'web_template')

    # Create the destination folder if it doesn't exist
    web_subfolder_path = os.path.join(destination_path, subFolderName)
    os.makedirs(web_subfolder_path, exist_ok=True)
    
    # copies the web template 
    sh.copytree(source_folder, web_subfolder_path, dirs_exist_ok=True)

    # makes sub folder for data
    data_destination_path = os.path.join(web_subfolder_path, 'data')
    os.makedirs(data_destination_path, exist_ok=True)

    # outputs all the required data for the web report
    # non filtered
    place_stats_dict = structured_dataset.place_stats_to_dict()
    data_py_to_js(place_stats_dict, data_destination_path, 'placeStats')
    season_stats_dict = structured_dataset.season_stats_to_dict()
    data_py_to_js(season_stats_dict, data_destination_path, 'seasonalStats')
    # climatology filtered
    place_stats_clim_filtered_dict = filtered_climatology.place_stats_to_dict()
    data_py_to_js(place_stats_clim_filtered_dict, data_destination_path, 'placeStatsClimatologyFiltered')
    season_stats_clim_filtered_dict = filtered_climatology.season_stats_to_dict()
    data_py_to_js(season_stats_clim_filtered_dict, data_destination_path, 'seasonalStatsClimatologyFiltered')
    # monitoring filtered
    place_stats_mon_filtered_dict = filtered_monitoring.place_stats_to_dict()
    data_py_to_js(place_stats_mon_filtered_dict, data_destination_path, 'placeStatsMonitoringFiltered')
    season_stats_mon_filtered_dict = filtered_monitoring.season_stats_to_dict()
    data_py_to_js(season_stats_mon_filtered_dict, data_destination_path, 'seasonalStatsMonitoringFiltered')
    # all filtered
    place_stats_all_filtered_dict = filtered_all.place_stats_to_dict()
    data_py_to_js(place_stats_all_filtered_dict, data_destination_path, 'placeStatsAllFiltered')
    season_stats_all_filtered_dict = filtered_all.season_stats_to_dict()
    data_py_to_js(season_stats_all_filtered_dict, data_destination_path, 'seasonalStatsAllFiltered')

    options_dict = structured_dataset.options.__dict__
    data_py_to_js(options_dict, data_destination_path, 'options')

    properties_dict = filtered_all.properties.__dict__
    data_py_to_js(properties_dict, data_destination_path, 'datasetProperties')