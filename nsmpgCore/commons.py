import re
import numpy as np
import scipy.stats as sp
from typing import Tuple, Union

# Dictionary that correlates the period name
# with the number of periods that fit in a year
yearly_periods = {
    'month': 12,
    'dekad': 36,
    'pentad': 72,
}

# properties of the dataset
class Properties:
    def __init__(self, properties_dict: dict=None) -> None:
        self.period_unit_id: str
        self.period_length: int
        self.season_quantity: int

        self.place_ids : list[str]
        self.year_ids: list[str]
        self.climatology_year_ids: list[str]
        self.selected_years: Union(list[str], str)
        
        self.sub_season_ids: list[str]
        self.sub_season_monitoring_ids: list[str]
        self.sub_season_offset: int

        self.current_season_index: int
        self.current_season_id: str
        self.current_season_length: int

        if properties_dict is not None:
            self.update(properties_dict)

    def update(self, properties: dict):
        self.__dict__.update(properties)

# options for the computation
class Options:
    def __init__(self, climatology_start=None, climatology_end=None,
                 season_start=None, season_end=None, cross_years=None, selected_years=None,
                 is_forecast=None, output_types=None, dataset_properties:Properties=None):
        # constructs default options from the properties of the dataset
        if dataset_properties is not None:
            self.climatology_start=dataset_properties.year_ids[0]
            self.climatology_end=dataset_properties.year_ids[-1]
            self.season_start='Jan-1'
            self.season_end='Dec-3'
            self.selected_years=dataset_properties.year_ids
            self.cross_years=False
            self.is_forecast=False
            return
        self.climatology_start: str = climatology_start
        self.climatology_end: str = climatology_end

        self.season_start: str = season_start
        self.season_end: str = season_end
        self.cross_years: bool = cross_years

        self.selected_years: Union(list[str], str) = selected_years
        self.is_forecast: bool = is_forecast
        self.output_types: list[str] = output_types

    def overwrite(self, options: object):
        options = options.__dict__
        # Iterate over keys
        for key in self.__dict__:
            # If the value in dict1 is None, replace it with the value from dict2
            if options[key] is not None and key in options:
                self.__dict__[key] = options[key]

def define_seasonal_dict(july_june=False, period_unit='dekad') -> list:
    """Creates a list of seasonal periods for the given start and period unit.

    Args:
        start (int, optional): 
            Defines the initial month from which the seasons 
            should be defined. Defaults to 0.
        period_unit (str, optional): 
        Defines the length of each seasonal period. Defaults to 'dekad'.

    Returns:
        list: List of seasonal periods
    """
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    start = 6 if july_june else 0
    months = months[start:]+months[:start]
    period_unit = yearly_periods[period_unit] // 12
    if period_unit == 1: return months
    dekad_strings = [f'{month}-{i+1}' for month in months for i in range(period_unit)]
    return dekad_strings

def get_properties_validated_year_list(dataset_properties: Properties, cross_years=False) -> list:
    if cross_years:
        year_list = get_cross_years(dataset_properties.year_ids)
        if dataset_properties.current_season_length <= (yearly_periods[dataset_properties.period_unit_id] // 2):
            year_list.pop()
    else: year_list = dataset_properties.year_ids
    return year_list

# gets year from a column header string slice
def get_year_slice(year: str, start_index:int) -> str:
    """Extracts the year from a given string by slicing it using the provided start index.

    Args:
        year (str): A string representing a column header that contains the year.
        start_index (int): An integer representing the starting index of where to slice from.

    Returns:
        str: the four characters that represent the year in the column header string.
    """
    return year[start_index:start_index+4]

def get_cross_years(years: list[str]) -> list[str]:
    return [f'{year}-{int(year)+1}' for year in years]

def parse_timestamps(timestamps: list[str]) -> dict:
    """This function parses a list of timestamps to get properties of 
    the dataset.

    Args:
        timestamps (list[str]): 
            A list of strings containing timestamps for each row in the dataset. 
            Each string should have a six-digit number that indicates the year and 
            sub-period of the time series data.


    Returns:
        dict: A dictionary with entries as follows:
            'period_unit_id': ID for the period unit, such as 'year' or 'month'.
            'period_length': Number of rows in each period.
            'season_quantity': Number of periods in the seasonal subset of data.
            'year_ids': List of years corresponding to each row in the dataset.
            'current_season_index': Index of the current period in the dataset.
            'current_season_key': Year ID for the current season, if there is one.
            'current_season_length': Number of rows in the current seasonal subset.
    """
    # get timestamp offset from headers
    match = re.search(r"\d{6}", timestamps[0])
    if match is None:
        raise(RuntimeError('Each column must contain a six digit number indicating the year and sub-period number.'))
    timestamp_str_offset = match.start()

    # get period lenght from timestamps
    first_year = get_year_slice(timestamps[0], timestamp_str_offset)
    period_unit_id = None
    period_length = 0
    for p_unit, p_lenght in yearly_periods.items():
        offset_year = get_year_slice(timestamps[p_lenght], timestamp_str_offset)
        if first_year != offset_year:
            period_unit_id = p_unit
            period_length = p_lenght
            break
    
    # get period properties
    season_quantity = (len(timestamps) - 1) // period_length
    year_ids = [str(y) for y in range(int(first_year), int(first_year)+season_quantity)]
    current_season_index = season_quantity*period_length
    current_season_id = get_year_slice(timestamps[current_season_index], timestamp_str_offset)
    current_season_length = len(timestamps) - current_season_index
    return {
        'period_unit_id': period_unit_id,
        'period_length': period_length,
        'season_quantity': season_quantity,
        'year_ids': year_ids,
        'current_season_index': current_season_index,
        'current_season_id': current_season_id,
        'current_season_length': current_season_length,
    }

def percentiles_from_values(data, values=None) -> np.ndarray:
    if values is None:
        values = data
    return sp.percentileofscore(data, values, kind='rank')

# operates an array in an incremental way
def operate_each(data, f):
    return np.array([f(data[:i]) for i in range(1, len(data))])

# applies a function to each column of an array
def operate_column(data, f) -> np.ndarray:
    return f(data, axis=0)

def percentiles_to_values(data: np.ndarray, values=(3, 6, 11, 21, 31)) -> np.ndarray:
    return np.percentile(data, values)

def get_ensemble(current_data, post_data) -> np.ndarray:
    return np.cumsum(np.concatenate((current_data, post_data[len(current_data):])))

# slices a list given a element inside the list
def slice_by_element(_list: list, start, end=None) -> list:
    start_index = _list.index(start)

    if end is not None:
        end_index = _list.index(end) + 1

    sliced_list = _list[start_index:end_index]

    return sliced_list

def get_similar_years(current_year: np.ndarray, year_list: list[np.ndarray], year_ids: list[str]) -> list[str]:
    year_list = np.array(year_list)[:,:current_year.size]
    current_year_accumulation = np.cumsum(current_year)
    accumulations_list = np.cumsum(year_list, axis=1)
    differences = {
        'difference_each': np.sum((year_list - current_year) ** 2, axis=1),
        # 'difference_accumulations': np.sum((accumulations_list - current_year_accumulation) ** 2, axis=1),
        # 'difference_total': (accumulations_list[:,-1] - current_year_accumulation[-1]) ** 2,
        # 'inverse pearson correlation': [1 - (sp.pearsonr(arr, current_year).statistic) ** 2 for arr in year_list],
    }
    # for k,v in differences.items():
    #     sort_indexes = np.argsort(v)
    #     print(f'{k}: {v}')
    #     print(f'{k} indexes: {sort_indexes}')
    #     print(f'{k} years ranked: {[year_ids[i] for i in sort_indexes]}')
    ranked_indexes = np.argsort(differences['difference_each'])
    ranked_year_ids = [year_ids[i] for i in ranked_indexes]
    return ranked_year_ids