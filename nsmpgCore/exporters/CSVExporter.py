import os
import pandas as pd
from ..structures import Dataset

def wrap_stats(stats):
    """Wraps the statistical data for a place in a dictionary.

    Args:
        stats (dict): The statistical data for a place.

    Returns:
        wrapped_stats (dict): A dictionary of statistical data with some 
            additional formatting.
    """
    return {
            'LTA': round(stats['LTA'][-1]),
            'LTA up to Current Season': round(stats['LTA'][stats['Current Season Accumulation'].size-1]),
            'Median': round(stats['Median'][-1]),
            '33 Pctl.': round(stats['Pctls.'][0]),
            '67 Pctl.': round(stats['Pctls.'][1]),
            'St. Dev.': round(stats['St. Dev.'][-1]),
            'Current Season Sum': round(stats['Current Season Accumulation'][-1]),
            'Ensemble Med.': round(stats['Ensemble Med.'][-1]),
            '33 E. Pctl.': round(stats['E. Pctls.'][0]),
            '67 E. Pctl.': round(stats['E. Pctls.'][1]),
        }

def wrap_summary(stats):
    """Wraps the summary data for a place in a dictionary.

    Args:
        stats (dict): The summary data for a place.

    Returns:
        wrapped_stats (dict): A dictionary of summary data with some additional 
            formatting.
    """
    return {
            'C. Dk./LTA Pct.': round(stats['C. Dk./LTA'][-1]*100),
            'Ensemble Med./LTA Pct.': round(stats['Ensemble Med./LTA'][-1]*100),
            'Probability Below Normal': round(stats['E. Probabilities'][0]*100),
            'Probability in Normal': round(stats['E. Probabilities'][1]*100),
            'Probability Above Normal': round(stats['E. Probabilities'][2]*100),
            'Ensemble Med. Pctl.': round(stats['Ensemble Med. Pctl.'][0]),
            'Current Season Pctl.': round(stats['Current Season Pctl.'][0]),
        }

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
    headers = []
    climatology_stats = []
    climatology_summary = []
    selected_years_stats = []
    selected_years_summary = []
    similar_seasons = []
    for place_id, place in dataset.places.items():
        headers.append(place_id)
        climatology_stats.append(wrap_stats(place.place_stats))
        climatology_summary.append(wrap_summary(place.place_stats))
        selected_years_stats.append(wrap_stats(place.selected_years_place_stats))
        selected_years_summary.append(wrap_summary(place.selected_years_place_stats))
        similar_seasons.append(place.similar_seasons)

    data_path_relation = {
        'climatology_stats': [climatology_stats, f'{stats_subfolder_path}/climatology_stats{filename_suffix}.csv'],
        'climatology_summary': [climatology_summary, f'{stats_subfolder_path}/climatology_summary{filename_suffix}.csv'],
        'selected_years_stats': [selected_years_stats, f'{stats_subfolder_path}/selected_years_stats{filename_suffix}.csv'],
        'selected_years_summary': [selected_years_summary, f'{stats_subfolder_path}/selected_years_summary{filename_suffix}.csv'],
    }

    for v in data_path_relation.values():
        pd.DataFrame.from_records(v[0], index=headers).to_csv(v[1])
    pd.DataFrame(similar_seasons, index=headers).to_csv(f'{stats_subfolder_path}/similar_seasons{filename_suffix}.csv')

    # return path to selected years summary table
    return data_path_relation['selected_years_summary'][1]