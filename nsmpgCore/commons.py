import re
from dataclasses import dataclass
import numpy as np
import scipy.stats as sp

yearly_periods = {
    'year': 1,
    'month': 12,
    'dekad': 36,
    'pentad': 72,
    'day': 365,
}

def define_seasonal_dict(start=0, period_unit='dekad', return_key_list=True):
    """A fuction to spawn a standard dictionary of dekads
    as dekad:number.

    :return: a standard dictionary of dekads
    """
    period_unit = yearly_periods[period_unit] // 12
    if period_unit < 1: return ['']
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    months = months[start:]+months[:start]
    if period_unit == 1: return months
    dekad_strings = [f'{month}-{i+1}' for month in months for i in range(period_unit)]
    dekads = {dekad : i for i, dekad in enumerate(dekad_strings)}
    if return_key_list:
        return list(dekads.keys())
    return dekads

def get_year_slice(year: str, start_index:int) -> str:
    return year[start_index:start_index+4]

def parse_timestamps(timestamps: list[str]) -> dict:
    # get timestamp offset
    match = re.search(r"\d{6}", timestamps[0])
    if match is None:
        raise(RuntimeError('Each column must contain a six digit number indicating the year and sub-period number.'))
    timestamp_str_offset = match.start()

    # get period lenght from timestamps
    first_year = get_year_slice(timestamps[0], timestamp_str_offset)
    period_unit_id = None
    period_lenght = 0
    for p_unit, p_lenght in yearly_periods.items():
        offset_year = get_year_slice(timestamps[p_lenght], timestamp_str_offset)
        if first_year != offset_year:
            period_unit_id = p_unit
            period_lenght = p_lenght
            break
    
    # get period properties
    season_quantity = (len(timestamps) - 1) // period_lenght
    year_ids = [str(y) for y in range(int(first_year), int(first_year)+season_quantity)]
    current_season_index = season_quantity*period_lenght
    current_season_id = get_year_slice(timestamps[current_season_index], timestamp_str_offset)
    season_properties = {
        'timestamp_str_offset': timestamp_str_offset,
        'period_unit_id': period_unit_id,
        'season_quantity': season_quantity,
        'year_ids': year_ids,
        'current_season_index': current_season_index,
        'current_season_key': current_season_id,
    }
    return season_properties

def percentile(data) -> np.ndarray:
    return sp.percentileofscore(data, data, kind='rank')

def operate_each(data, f):
    return np.array([f(data[:i]) for i in range(1, len(data))])

def operate_column_parallel(data, f):
    result = []
    for i in range(0, len(data[0])):
        column = [sub_data[i] for sub_data in data]
        result.append(f(column))
    return np.array(result)

def percentiles_to_values(data: np.ndarray, values=(3, 6, 11, 21, 31)) -> np.ndarray:
    return np.percentile(data, values)

def to_scalar(data, position=-1):
    return np.sum(data[position])

def ensemble_sum(current_data, post_data):
    return np.cumsum(np.concatenate((current_data, post_data[len(current_data):])))