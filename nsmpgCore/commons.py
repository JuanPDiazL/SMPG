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

@dataclass
class SeasonalProperties:
    timestamp_start_index: int
    period_unit: str
    season_quantity: int
    current_season_index: int
    current_season_key: str

def parse_timestamps(timestamps: list[str]) -> SeasonalProperties:
    # get timestamp offset
    first_timestamp = timestamps[0]
    match = re.search(r"\d{6}", first_timestamp)
    if match is None:
        raise(RuntimeError('Each column must contain a six digit number indicating the year and sub-period.'))
    timestamp_start = match.start()

    # get period lenght from timestamps
    first_year = get_year_slice(first_timestamp, timestamp_start)
    period_unit = None
    period_lenght = 0
    for p_unit, p_lenght in yearly_periods.items():
        offset_year = get_year_slice(timestamps[p_lenght], timestamp_start)
        if first_year != offset_year:
            period_unit = p_unit
            period_lenght = p_lenght
            break
    
    # get period properties
    n_seasons = (len(timestamps) - 1) // period_lenght
    current_season_index = n_seasons*period_lenght
    current_season_key = get_year_slice(timestamps[current_season_index], timestamp_start)
    return SeasonalProperties(timestamp_start, period_unit, n_seasons, current_season_index, current_season_key)

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
    # return dict(map(lambda v: (str(v), np.percentile(data, v)), values))
    return np.percentile(data, values)

def to_scalar(data, position=-1):
    return np.sum(data[position])

def ensemble_sum(current_data, post_data):
    return np.cumsum(np.concatenate((current_data, post_data[len(current_data):])))