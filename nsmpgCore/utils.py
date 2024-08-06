import re
import numpy as np
import scipy.stats as sp
from typing import Optional, Union

# Dictionary that correlates the period name
# with the number of periods that fit in a year
yearly_periods = {
    'Month': 12,
    'Dekad': 36,
    'Pentad': 72,
}

# TODO: separate computation properties from dataset properties
class Properties:
    """This class represents the properties of a time series dataset.

    Attributes:
        period_unit_id: The ID of the period unit (e.g., "Dekad", "Month")
        period_length: The number of periods in a year.
        season_quantity: The number of years in the dataset.
        year_ids: A list of year IDs in the dataset.
        current_season_index: The index of the current period in the dataset
        current_season_id: The year ID for the current year.
        current_season_length: The number of periods in the current year.
    """
    def __init__(self, properties_dict: dict=None) -> None:
        """Constructor

        Args:
            properties_dict (dict, optional): A dictionary of properties. 
                Defaults to None.
        """
        self.period_unit_id: str
        self.period_length: int
        self.season_quantity: int

        self.place_ids : list[str]
        self.year_ids: list[str]
        self.climatology_year_ids: list[str] # computation property
        self.selected_years: Union[list[str], str] # computation property
        
        self.sub_season_ids: list[str] # computation property
        self.sub_season_monitoring_ids: list[str] # computation property
        self.sub_season_offset: int # computation property

        self.current_season_index: int
        self.current_season_id: str
        self.current_season_length: int

        if properties_dict is not None:
            self.update(properties_dict)

    def update(self, properties: dict):
        """Update the attributes of the class from the given properties dict.

        Args:
            properties (dict): A dictionary of properties.
        """
        self.__dict__.update(properties)

class Parameters:
    """It represents the parameters that define how the data should be processed.

    Attributes
        climatology_start (str): The start year of the climatology period. 
            Defaults to 1991.
        climatology_end (str): The end year of the climatology period. 
            Defaults to 2020.
        season_start (str): The start month of the monitoring season. 
            Defaults to None.
        season_end (str): The end month of the monitoring season. 
            Defaults to None.
        cross_years (bool): A boolean indicating whether to use July-June 
            seasons. Defaults to False.
        selected_years (list | int): This represents the selected years.
            When it is a list, it is the list of selected years.
            When it is a int, it is the number of similar years. 
            Defaults to None.
        use_pearson (bool): A boolean indicating whether to use Pearson's 
            correlation coefficient for selecting similar years. 
            Defaults to False.
        is_forecast (bool): A boolean indicating whether the dataset has a 
            forecast period. Defaults to False.
        output_web (bool): A boolean indicating whether to output the web 
            reports. Defaults to True.
        output_images (bool): A boolean indicating whether to output the image 
            report files. Defaults to False.
        output_stats (bool): A boolean indicating whether to output the 
            statistical results as CSV. Defaults to True.
        output_parameters (bool): A boolean indicating whether to output the 
            parameters used in the computation. Defaults to False.
        mapping_attributes (list[str]): A list of attribute names that should 
            be used to generate the QGIS maps. Defaults to [].
    """
    def __init__(self, parameters={}, **kwargs) -> None:
        """Constructor.

        Args:
            parameters (dict, optional): A dictionary of parameters. 
                Defaults to {}.
        """
        # climatology defaults
        self.climatology_start: str | None = '1991'
        self.climatology_end: str | None = '2020'
        # monitoring season defaults
        self.season_start: str | None = None
        self.season_end: str | None = None
        self.cross_years = False
        # year selection defaults
        self.selected_years: list[str] | int | None = None
        self.use_pearson = False
        # forecasting defaults
        self.is_forecast = False
        # output defaults
        self.output_web = True
        self.output_images = False
        self.output_stats = True
        self.output_parameters = False
        self.mapping_attributes: list[str] = []

        self.set_parameters(parameters, **kwargs)

    def set_parameters(self, parameters={}, **kwargs) -> dict:
        """
        Sets the attributes of the class from the given dictionary and 
        arguments.

        Args:
            parameters (dict, optional): A dictionary of parameters. 
                Defaults to {}.

        Returns:
            dict: The non-attribute parameters that were not set as attributes 
                of this class.
        """
        non_attributes = {}
        all_parameters = {**parameters, **kwargs}
        for key, value in all_parameters.items():
            if hasattr(self, key):
                setattr(self, key, value)
            else:
                non_attributes[key] = value
        return non_attributes
    
    def to_dict(self):
        """converts the object to a dict.

        Returns:
            _type_: the object as a dict.
        """
        return {k: getattr(self, k) for k in dir(self) if not k.startswith('_') and k != 'to_dict'}

def define_seasonal_dict(july_june=False, period_unit='Dekad') -> list:
    """Creates a list of seasonal periods.

    Args:
        july_june: A boolean indicating whether the seasons should be defined 
            from July to June. 
            Defaults to False.
        period_unit (str, optional): Defines the length of each seasonal 
            period. 
            Defaults to 'Dekad'.

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
    """
    This function gets the valid year IDs list from a dataset's properties.

    Args:
        dataset_properties: The dataset's properties object
        cross_years: A boolean indicating whether cross-years are being used.
            Defaults to False.

    Returns:
        list: a list of year IDs.
    """
    if cross_years:
        year_list = get_cross_years(dataset_properties.year_ids)
        if dataset_properties.current_season_length <= (yearly_periods[dataset_properties.period_unit_id] // 2):
            year_list.pop()
    else: year_list = dataset_properties.year_ids
    return year_list

def get_year_slice(year: str, start_index:int) -> str:
    """
    Extracts the year from a given string by slicing it using the provided 
    start index.

    Args:
        year (str): A string representing a column header that contains the 
            year.
        start_index (int): An integer representing the starting index of where 
            to slice from.

    Returns:
        str: the four characters that represent the year in the column header 
            string.
    """
    return year[start_index:start_index+4]

def get_cross_years(years: list[str]) -> list[str]:
    """
    This function gets a list of years and returns a list of strings 
    representing the years with an additional year at the end.

    Args:
        years (list[str]): A list of integers representing the years.

    Returns:
        list[str]: a list of cross-year IDs.
    """
    return [f'{year}-{int(year)+1}' for year in years]

def parse_timestamps(timestamps: list[str]) -> dict:
    """
    This function parses a list of timestamps to get properties of the dataset.

    Args:
        timestamps (list[str]): 
            A list of timestamp string for each column in the dataset. 
            Each string should have a six-digit number that indicates the year 
            and sub-period of the time series data.


    Returns:
        dict: A dictionary with entries as follows:
            'period_unit_id': ID for the period unit, such as 'Dekad' or 
                'Month'.
            'period_length': Number of values in each year.
            'season_quantity': Number of years in the dataset.
            'year_ids': List of years IDs corresponding to the years in the 
                dataset.
            'current_season_index': Index of the current period in the dataset.
            'current_season_key': Year ID for the current season.
            'current_season_length': Number of periods in the current season.
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
    """
    Calculate the percentile of each value in the array `data` relative to the 
    values in `values`.

    Parameters:
        data (np.ndarray): The array of values for which the percentiles will 
            be calculated.
        values (np.ndarray, optional): An array of values that define the range 
            of values in `data`. If not provided, `data` is used instead.

    Returns:
        np.ndarray: An array containing the percentile rank of each value in 
            `data`.
    """
    if values is None:
        values = data
    return sp.percentileofscore(data, values, kind='rank')

def operate_each(data, f):
    """Apply the function `f` to each element in the array `data`.

    Parameters:
        data (np.ndarray): The array of values that will be operated on.
        f (function): A function that takes a single argument and returns a 
            value.

    Returns:
        np.ndarray: An array containing the result of applying `f` to each 
            element in `data`.
    """
    return np.array([f(data[:i]) for i in range(1, len(data))])

def operate_column(data, f) -> np.ndarray:
    """Apply the function `f` to each column of the array `data`.

    Parameters:
        data (np.ndarray): The array of values that will be operated on.
        f (function): A function that takes a single argument and returns a 
            value.

    Returns:
        np.ndarray: An array containing the result of applying `f` to each 
            column in `data`.
    """
    return f(data, axis=0)

def percentiles_to_values(data: np.ndarray, percentiles=(3, 6, 11, 21, 31)) -> np.ndarray:
    """
    Calculate the corresponding values in `data` that correspond to the 
    specified percentiles.

    Parameters:
        data (np.ndarray): The array of values that will be used for 
            calculation.
        percentiles (tuple, optional): A tuple containing the percentile ranks 
            that will be used to calculate the corresponding values in `data`. 
            Defaults to (3, 6, 11, 21, 31).

    Returns:
        np.ndarray: An array containing the corresponding values in `data` for 
            the specified percentiles.
    """
    return np.percentile(data, percentiles)

def get_ensemble(current_data, post_data) -> np.ndarray:
    """
    Calculate the ensemble of two arrays by cumulatively summing their 
    elements.

    Parameters:
        current_data (np.ndarray): The first array to be used in the 
            calculation of the ensemble.
        post_data (np.ndarray): The second array to be used in the calculation 
            of the ensemble.

    Returns:
        np.ndarray: An array containing the cumulative sum of the elements of 
            `current_data` and `post_data`.
    """
    return np.cumsum(np.concatenate((current_data, post_data[len(current_data):])))

def slice_by_element(_list: list, start, end=None) -> list:
    """Slice a list by the position of a given element.

    Parameters:
        _list (list): The list to be sliced.
        start (object): The element that will define the starting point of the 
            slice.
        end (object, optional): The element that will define the ending point 
            of the slice. If not provided, the slice will extend to the end of 
            the list.

    Returns:
        list: A sliced version of `_list` from `start` to `end`.
    """
    start_index = _list.index(start)

    if end is not None:
        end_index = _list.index(end) + 1

    sliced_list = _list[start_index:end_index]

    return sliced_list

def get_similar_years(current_year: np.ndarray, year_list: list[np.ndarray], 
                      year_ids: list[str], use_pearson=False) -> list[str]:
    """
    Get the years that are similar to the current year based on certain 
    criteria, such as rank of a curve, total accumulation, and Pearson 
    correlation.

    Parameters:
        current_year (np.ndarray): The current year that will be used for 
            comparison.
        year_list (list[np.ndarray]): A list of arrays containing the years to 
            be compared with `current_year`.
        year_ids (list[str]): A list of IDs corresponding to each year in 
            `year_list`.
        use_pearson (bool, optional): Whether or not to use Pearson correlation 
            as a criteria for similarity. Defaults to False.

    Returns:
        list[str]: A list containing the IDs of the years that are similar to 
            `current_year`.
    """
    year_list = np.array(year_list)[:,:current_year.size]
    current_year_accumulation = np.cumsum(current_year)
    accumulations_list = np.cumsum(year_list, axis=1)
    data_curve_rankings = np.argsort(np.sum((year_list - current_year) ** 2, axis=1))
    accumulation_curve_rankings = np.argsort(np.sum((accumulations_list - current_year_accumulation) ** 2, axis=1))
    season_total_rankings = np.argsort((accumulations_list[:,-1] - current_year_accumulation[-1]) ** 2)
    sum_of_rankings = data_curve_rankings + accumulation_curve_rankings + season_total_rankings
    if use_pearson:
        pearson_correlation_rankings = np.argsort([1 - (sp.pearsonr(arr, current_year).statistic) ** 2 for arr in year_list])
        sum_of_rankings += pearson_correlation_rankings
    ranked_indexes = np.argsort(sum_of_rankings)
    ranked_year_ids = [year_ids[i] for i in ranked_indexes]
    return ranked_year_ids

def get_default_parameters_from_properties(properties: Properties, keys: str = None) -> dict:
    if keys is None:
        keys = ['climatology_start', 'climatology_end', 'selected_years']
    defaults = {
        'climatology_start': properties.year_ids[0],
        'climatology_end': properties.year_ids[-1],
        'selected_years': properties.year_ids,
    }
    return dict(map(lambda k: (k, defaults[k]), keys))