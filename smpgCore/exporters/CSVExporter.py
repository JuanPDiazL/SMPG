import os
import pandas as pd
from ..structures import Dataset

def wrap_stats(place_general_stats: dict, seasonal_general_stats: pd.Series):
    """Wraps the statistical data for a place in a Series.

    Args:
        place_general_stats (dict): A dictionary of general statistics for a place.
        seasonal_general_stats (Series): A pandas Series containing seasonal general statistics.

    Returns:
        Series: A new pandas Series with the wrapped statistical data.
   
    """
    return pd.Series({
        'Current Season Total': place_general_stats.loc['Current Season Total'],
        'LTA': seasonal_general_stats['LTA'],
        'LTA up to Current Season': seasonal_general_stats['LTA up to Current Season'],
        'Median': seasonal_general_stats['Median'],
        'Ensemble Med.': seasonal_general_stats['Ensemble Med.'],
        'St. Dev.': seasonal_general_stats['St. Dev.'],
        'Climatology 33 Pctl.': place_general_stats['Climatology 33 Pctl.'],
        'Climatology 67 Pctl.': place_general_stats['Climatology 67 Pctl.'],
        'Ensemble 33 Pctl.': seasonal_general_stats['Ensemble 33 Pctl.'],
        'Ensemble 67 Pctl.': seasonal_general_stats['Ensemble 67 Pctl.'],
    }
    , name=seasonal_general_stats.name)

def wrap_summary(place_general_stats: dict, seasonal_general_stats: pd.Series):
    """Wraps the summary data for a place in a dictionary.

    Args:
        place_general_stats (dict): A dictionary of general statistics for a place.
        seasonal_general_stats (Series): A pandas Series containing seasonal general statistics.

    Returns:
        Series: A new pandas Series with the wrapped summary data.
    """
    return pd.Series({
        'C. Dk./LTA Pct.': seasonal_general_stats['C. Dk./LTA Pct.'],
        'Ensemble Med./LTA Pct.': seasonal_general_stats['Ensemble Med./LTA Pct.'],
        'Probability Below Normal': seasonal_general_stats['E. Prob. Below Normal Pct.'],
        'Probability of Normal': seasonal_general_stats['E. Prob. of Normal Pct.'],
        'Probability Above Normal': seasonal_general_stats['E. Prob. Above Normal Pct.'],
        'Ensemble Med. Pctl.': seasonal_general_stats['Ensemble Med. Pctl.'],
        'Current Season Pctl.': place_general_stats['Current Season Pctl.'],
    }
    , name=seasonal_general_stats.name)

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
    climatology_summary = []
    selected_years_stats = []
    selected_years_summary = []
    similar_seasons = []
    for place in dataset.places.values():
        climatology_stats.append(wrap_stats(place.place_general_stats, place.seasonal_general_stats))
        climatology_summary.append(wrap_summary(place.place_general_stats, place.seasonal_general_stats))
        selected_years_stats.append(wrap_stats(place.place_general_stats, place.selected_seasons_general_stats))
        selected_years_summary.append(wrap_summary(place.place_general_stats, place.selected_seasons_general_stats))
        similar_seasons.append(place.similar_seasons)

    data_path_relation = {
        'climatology_stats': [climatology_stats, f'{stats_subfolder_path}/climatology_stats{filename_suffix}.csv'],
        'climatology_summary': [climatology_summary, f'{stats_subfolder_path}/climatology_summary{filename_suffix}.csv'],
        'selected_years_stats': [selected_years_stats, f'{stats_subfolder_path}/selected_years_stats{filename_suffix}.csv'],
        'selected_years_summary': [selected_years_summary, f'{stats_subfolder_path}/selected_years_summary{filename_suffix}.csv'],
    }

    for series_list, path in data_path_relation.values():
        pd.DataFrame(series_list).round().to_csv(path)
    pd.DataFrame(similar_seasons, index=list(dataset.places.keys())).to_csv(f'{stats_subfolder_path}/similar_seasons{filename_suffix}.csv')

    # return path to selected years summary table
    return data_path_relation['selected_years_summary'][1]