import os
import pandas as pd
from ..structures import Dataset

def wrap_stats(stats):
    return {
            'LTA': stats['LTA'][-1],
            'LTA up to Current Season': stats['LTA'][stats['Current Season Accumulation'].size-1],
            'LTM': stats['LTM'][-1],
            '33 Pctl.': stats['Pctls.'][0],
            '67 Pctl.': stats['Pctls.'][1],
            'St. Dev.': stats['St. Dev.'][-1],
            'Current Season Sum': stats['Current Season Accumulation'][-1],
            'E. LTM': stats['E. LTM'][-1],
            '33 E. Pctl.': stats['E. Pctls.'][0],
            '67 E. Pctl.': stats['E. Pctls.'][1],
        }

def wrap_summary(stats):
    return {
            'C. Dk./LTA Pct.': stats['C. Dk./LTA'][-1]*100,
            'E. LTM/LTA Pct.': stats['E. LTM/LTA'][-1]*100,
            'Probability Below Normal': round(stats['E. Probabilities'][0]*100, 1),
            'Probability in Normal': round(stats['E. Probabilities'][1]*100, 1),
            'Probability Above Normal': round(stats['E. Probabilities'][2]*100, 1),
            'E. LTM Pctl.': stats['E. LTM Pctl.'][0],
            'Current Season Pctl.': stats['Current Season Pctl.'][0],
        }

def export_to_csv_files(destination_path, dataset: Dataset, subFolderName='Statistics'):
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