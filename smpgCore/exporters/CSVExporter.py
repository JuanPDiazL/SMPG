import os
import pandas as pd
from ..structures import Dataset

def export_to_csv_files(destination_path, dataset: Dataset, subFolderName='Statistics'):
    """
    Exports the statistical and summary data for a dataset to CSV files in a 
    specified folder.

    Args:
        destination_path (str): The path to the folder where the CSV files will 
            be saved.
        dataset (Dataset): The dataset whose data will be exported.
        subFolderName (str, optional): The name of the subfolder where the CSV 
            files will be saved. Defaults to 'Statistics'.

    Returns:
        str: the path to the selected years summary file.
    """
    filename_suffix = f' [{dataset.name}] [dek{dataset.properties.current_season_id}{dataset.properties.current_season_length}]'
    stats_subfolder_path = os.path.join(destination_path, subFolderName)
    os.makedirs(stats_subfolder_path, exist_ok=True)
    climatology_stats = []
    selected_years_stats = []
    general_stats = []
    similar_seasons = []
    for place in dataset.places.values():
        climatology_stats.append(pd.Series(place.seasonal_general_stats, name=place.id))
        selected_years_stats.append(pd.Series(place.selected_seasons_general_stats, name=place.id))
        general_stats.append(pd.Series(place.place_general_stats, name=place.id))
        similar_seasons.append(place.similar_seasons)

    data_path_relation = {
        'climatology_stats': [climatology_stats, f'{stats_subfolder_path}/climatology_stats{filename_suffix}.csv'],
        'selected_years_stats': [selected_years_stats, f'{stats_subfolder_path}/selected_years_stats{filename_suffix}.csv'],
        'general_stats': [general_stats, f'{stats_subfolder_path}/general_stats{filename_suffix}.csv'],
    }

    for series_list, path in data_path_relation.values():
        pd.DataFrame(series_list).round().to_csv(path, encoding='utf-8')
    pd.DataFrame(similar_seasons, index=list(dataset.places.keys())).to_csv(f'{stats_subfolder_path}/similar_seasons{filename_suffix}.csv')

    # return path to selected years summary table
    return data_path_relation