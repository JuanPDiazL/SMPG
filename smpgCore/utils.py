import re
import numpy as np
import scipy.stats as sp
import pandas as pd
from collections import deque
from typing import Optional, Union

# Dictionary that correlates the period name
# with the number of periods that fit in a year
yearly_periods = {
    'Month': 12,
    'Dekad': 36,
    'Pentad': 72,
}

STARTED_STR = 'Started'
POSSIBLE_START_STR = 'Possible Start'
NO_START_STR = 'No Start'
LATE_STR = 'Late'
NO_REFERENCE_STR = 'No Reference'
YET_TO_START_STR = 'Yet to Start'

# TODO: separate computation properties from dataset properties
class Properties:
    """This class represents the properties of a time series dataset.

    Attributes:
        dataset_name: name of the dataset file
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
        self.dataset_name: str
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

        self.season_start_index: int
        self.season_end_index: int
        self.current_season_trim_index: int

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
        # input defaults
        self.shapefile_path: str = ''
        self.target_id_field: str = ''
        self.reference_shapefile_path: str = ''
        # climatology defaults
        self.climatology_start: Optional[str] = '1991'
        self.climatology_end: Optional[str] = '2020'
        # monitoring season defaults
        self.season_start: Optional[str] = None
        self.season_end: Optional[str] = None
        self.cross_years = False
        # year selection defaults
        self.selected_years: Optional[Union[list[str], int]] = None
        self.use_pearson = False
        # analysis defaults
        self.is_forecast = False
        self.rainy_season_detection = {
            "sos": {
                "enabled": False,
                "method": "fixed",
                "first_threshold": 25,
                "second_threshold": 20,
            },
            "eos": {
                "enabled": False,
            },
        }
        # output defaults
        self.output_stats = True
        self.output_parameters = False
        self.mapping_attributes: list[str] = []
        self.open_web_report = True

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

def define_seasonal_dict(july_june=False, period_unit_id='Dekad') -> list:
    """Creates a list of seasonal periods.

    Args:
        july_june: A boolean indicating whether the seasons should be defined 
            from July to June. 
            Defaults to False.
        period_unit_id (str, optional): Defines the length of each seasonal 
            period. 
            Defaults to 'Dekad'.

    Returns:
        list: List of seasonal periods
    """
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    start = 6 if july_june else 0
    months = months[start:]+months[:start]
    period_unit = yearly_periods[period_unit_id] // 12
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

def decompose_timestamp(timestamp: str) -> tuple:
    """
    Extracts the date elements from a given string by slicing it using a 
    regular expression.

    Args:
        timestamp (str): A string representing a column header that contains 
        the timestamp in a specific format.
    Returns:
        tuple: A tuple containing the extracted parts of a timestamp.

    """
    year = n1 = n2 = None
    regular_expression_pattern = r'(\d{4}\.\d{2}\.\d{1,2})|(\d{6})'

    # Search for the first match in the text
    match = re.search(regular_expression_pattern, timestamp)
    if match:
        if match.group(1):  # If the first pattern (YYYY.MM.N, N is the sub-period) matched

            date_str = match.group(1)
            year, n1, n2 = date_str.split('.')
        else:  # If the second pattern (YYYYNN, NN is the sub-period) matched
            date_str = match.group(2)
            year = date_str[:4]
            n1 = date_str[4:]
        return year, n1, n2
    else:
        raise ValueError("No valid date pattern found")


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
    try: # get matching values of first year
        first_year, _, _ = decompose_timestamp(timestamps[0])
    except ValueError as e:
        if 'No valid date pattern found' in str(e):
            raise(RuntimeError('Each column must contain a datestamp in the form of "YYYY.MM.N" or "YYYYNN".\n'
                           + 'For example, "2019.01.3" or "201903".'))

    # get period length from timestamps by detecting the change in the year by
    # adding the number of sub-periods in a year (12 months, 36 dekads, 72 pentads)
    period_unit_id = None
    period_length = 0
    for p_unit, p_lenght in yearly_periods.items():
        try:
            offset_year, _, _ = decompose_timestamp(timestamps[p_lenght])
        except IndexError as e:
            if 'list index out of range' in str(e):
                raise(RuntimeError('The current table is too short. \nThe table must contain at least a current year and a historical year.'))
        if first_year != offset_year:
            period_unit_id = p_unit
            period_length = p_lenght
            break
    
    # get period properties
    season_quantity = (len(timestamps) - 1) // period_length
    year_ids = [str(y) for y in range(int(first_year), int(first_year)+season_quantity)]
    current_season_index = season_quantity*period_length
    current_season_id, _, _ = decompose_timestamp(timestamps[current_season_index])
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

def get_ensemble(fixed_data: np.ndarray, post_data: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate the ensemble of two arrays by cumulatively summing their 
    elements.

    Parameters:
        fixed_data (ndarray): The array to be used in the 
            calculation of the ensemble.
        post_data (DataFrame): A DataFrame to be used in the calculation 
            of the ensemble.

    Returns:
        DataFrame: A DataFrame containing the cumulative sum of the elements of 
            `fixed_data` and `post_data`.
    """
    fixed_series_indexes = post_data.columns[:len(fixed_data)]
    fixed_series = pd.Series(fixed_data, index=fixed_series_indexes, name='Current Season')
    fixed_series_cumsum = fixed_series.cumsum()
    post_data_slice = post_data.iloc[:, len(fixed_data):]

    if post_data_slice.empty:
        return post_data.apply(lambda _: fixed_series_cumsum, axis=1)
    return post_data_slice.apply(lambda row: pd.concat([fixed_series_cumsum, row.cumsum()]), axis=1)


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

def get_key_by_value(dictionary: dict, value) -> str:
    """Get the key corresponding to a given value in a dictionary.

    Parameters:
        dictionary (dict): The dictionary to search in.
        value: The value to search for.

    Returns:
        str: The key corresponding to `value` in `dictionary`, or None if no 
        key corresponds to `value` in `dictionary`.
    """
    return next((k for k, v in dictionary.items() if v == value), None)

def get_similar_years(reference_year: np.ndarray, year_df: pd.DataFrame, 
                      use_pearson=False) -> list[str]:
    """
    Get the ranked year ids based on similarity to the reference year, using 
    criteria such as difference of raw and accumulation curves, total 
    accumulation comparison, and Pearson correlation if selected. The final 
    ranking is the sum of all previous rankings.

    Args:
        reference_year (ndarray): A 1D numpy array representing the values for 
            a specific reference year.
        year_df (DataFrame): A pandas DataFrame with columns containing the 
            time series data for each year. The index will be treated as the ID of 
            the years in ascending order.
        use_pearson (bool, optional):
            A flag indicating whether to also calculate and consider Pearson's
            r-statistic for correlation between the reference year and each other 
            year. Defaults to False.

    Returns:
        list[str]: A list containing the IDs of the most similar years based on 
            certain criteria.
    """
    year_df = year_df.iloc[:,:reference_year.size]
    year_ids = list(year_df.index)
    current_year_accumulation = np.cumsum(reference_year)
    accumulations = year_df.cumsum(axis=1)
    curve_diff_rankings = np.argsort(np.sum((year_df - reference_year) ** 2, axis=1))
    accumulation_curve_rankings = np.argsort(np.sum((accumulations - current_year_accumulation) ** 2, axis=1))
    season_total_rankings = np.argsort((accumulations.iloc[:,-1] - current_year_accumulation[-1]) ** 2)
    sum_of_rankings = curve_diff_rankings + accumulation_curve_rankings + season_total_rankings
    if use_pearson:
        pearson_correlation_rankings = np.argsort([1 - (sp.pearsonr(arr, reference_year).statistic) ** 2 for arr in year_df])
        sum_of_rankings += pearson_correlation_rankings
    ranked_indexes = np.argsort(sum_of_rankings)
    ranked_year_ids = [year_ids[i] for i in ranked_indexes]
    return ranked_year_ids

def get_default_parameters_from_properties(properties: Properties, keys: str = None) -> dict:
    """
    Returns a dictionary of default parameters based on the given properties.

    The returned dictionary contains the default values for 'climatology_start',
    'climatology_end', and 'selected_years' keys. If specific keys are provided,
    only those will be included in the output dictionary.

    Args:
        properties (Properties): An object containing properties.
        keys (str, optional): A list of specific keys to include in the output
            dictionary. Defaults to None.

    Returns:
        dict: A dictionary of default parameters with the specified keys.
    """
    if keys is None:
        keys = ['climatology_start', 'climatology_end', 'selected_years']
    defaults = {
        'climatology_start': properties.year_ids[0],
        'climatology_end': properties.year_ids[-1],
        'selected_years': properties.year_ids,
    }
    return dict(map(lambda k: (k, defaults[k]), keys))

def startswith_substring(string_list: list[str], target_string: str):
    """
    Check if any string in the given list starts with the specified target 
    substring.

    Args:
        string_list (list): A list of strings to search through.
        target_string (str): The substring to search for.

    Returns:
        bool: True if any string in the list contains the target substring, 
            False otherwise.
    """
    return any(s.startswith(target_string) for s in string_list)

def get_sos_fixed(year_data: pd.Series, first_value, second_value):
    """
    Determines the index at which a rainy season have started based on the 
    given data of a year and fixed threshold values.
    
    Args:
        year_data (pd.Series): A pandas Series containing numerical data of the 
            year.
        first_value (int, optional): The first threshold value for determining 
            the possible start of a season.
        second_value (int, optional): The second threshold value for confirming 
            the start of a season.
    
    Returns:
        tuple: A tuple containing two elements:
            - int: The index at which the season might have started, or None if 
                no such index is found.
            - bool: True if the season meets both conditions to start, 
                False otherwise.
            - str: A string indicating the class of the start.
                Possible values are STARTED_STR, POSSIBLE_START_STR, 
                and NO_START_STR.
    """
    # dq numbers: candidate_p, subsequent_p1, subsequent_p2
    dq = deque(maxlen=3) # when `dq` is full, drops elements on a FIFO manner
    last_candidate = None
    def candidate_condition(dq): 
        return dq[0] >= first_value
    def confirming_condition(dq): 
        return dq[1] + dq[2] >= second_value
    
    for i, value in enumerate(year_data):
        dq.append(value)
        if len(dq) < 3: continue # avoid out of bounds
        if candidate_condition(dq):
            if last_candidate is None: last_candidate = i - 2 
            if confirming_condition(dq):
                return i - 2, True, STARTED_STR

    if last_candidate is not None: 
        return last_candidate, False, POSSIBLE_START_STR
    while len(dq) >= 1: # check remaining values in `dq` for possible start
        if candidate_condition(dq):
            return len(year_data) - len(dq), False, POSSIBLE_START_STR
        dq.popleft()
    return np.NaN, False, NO_START_STR

def get_sos_pct_clim_avg(year_data: pd.Series, clim_avg: pd.Series, first_value, second_value):
    """
    Determines the index at which a rainy season have started based on the 
    given data of a year, using proportions between the current year and 
    the climatology average.
    
    Args:
        year_data (pd.Series): A pandas Series containing numerical data of the 
            year.
        first_value (int, optional): Percentage of climatology average period.
        second_value (int, optional): Percentage of climatology average's 
            second subsequent period.
    
    Returns:
        tuple: A tuple containing three elements:
            - int: The index at which the season might have started, or NaN if 
                no such index is found.
            - bool: True if the season meets both conditions to start, 
                False otherwise.
            - str: A string indicating the class of the start.
                Possible values are STARTED_STR, POSSIBLE_START_STR, 
                and NO_START_STR.
    """
    # dq numbers: candidate_p, subsequent_p1, subsequent_p2
    # dq_c numbers: candidate_avg_p, subsequent_avg_p1, subsequent_avg_p2
    dq, dq_c = deque(maxlen=3), deque(maxlen=3) # when `dq` is full, drops elements on a FIFO manner
    last_candidate = None
    def candidate_condition(dq, dq_c): 
        return ((dq[0]/dq_c[0])*100 >= first_value)
    def confirming_condition(dq, dq_c): 
        return (((dq[1] + dq[2])/dq_c[2])*100 >= second_value)
    def fallback_candidate_condition(dq):
        return (dq[0] >= 25)
    def fallback_confirming_condition(dq):
        return (dq[1] + dq[2] >= 20)
    
    for i in range(len(year_data)):
        dq.append(year_data[i])
        dq_c.append(clim_avg[i])
        if len(dq) < 3: continue # avoid out of bounds
        if candidate_condition(dq, dq_c):
            if last_candidate is None: last_candidate = i - 2 
            if confirming_condition(dq, dq_c):
                return i - 2, True, STARTED_STR
        elif fallback_candidate_condition(dq):
            if last_candidate is None: last_candidate = i - 2 
            if fallback_confirming_condition(dq_c):
                return i - 2, True, STARTED_STR

    if last_candidate is not None: 
        return last_candidate, False, POSSIBLE_START_STR
    while (len(dq) >= 1 and len(dq_c) >= 1): # check remaining values in deques for possible start
        if candidate_condition(dq, dq_c) or fallback_candidate_condition(dq):
            return len(year_data) - len(dq), False, POSSIBLE_START_STR
        dq.popleft()
        dq_c.popleft()
    return np.NaN, False, NO_START_STR

def get_sos_pct_difference(year_data: pd.Series, first_value, second_value):
    """
    Determines the index at which a rainy season have started based on the 
    given data of a year, using ratios of change and proportions between 
    periods.
    
    Args:
        year_data (pd.Series): A pandas Series containing numerical data of the 
            year.
        first_value (int, optional): Percentage of change relative to the 
            previous period.
        second_value (int, optional): Percentage rain relative to the candidate 
            period.
    
    Returns:
        tuple: A tuple containing three elements:
            - int: The index at which the season might have started, or NaN if 
                no such index is found.
            - bool: True if the season meets both conditions to start, 
                False otherwise.
            - str: A string indicating the class of the start.
                Possible values are STARTED_STR, POSSIBLE_START_STR, 
                and NO_START_STR.
    """
    # dq numbers: previous_p, candidate_p, subsequent_p1, subsequent_p2
    dq = deque(maxlen=4) # when `dq` is full, drops elements on a FIFO manner
    last_candidate = None
    def candidate_condition(dq): 
        return ((dq[1] - dq[0]) / dq[0] >= 1 + (first_value / 100))
    def confirming_condition(dq): 
        return ((dq[3] + dq[2]) / dq[1] >= 1 + (second_value / 100))
    
    for i in range(len(year_data)):
        dq.append(year_data[i])
        if len(dq) < 4: continue # avoid out of bounds
        if candidate_condition(dq): 
            if last_candidate is None: last_candidate = i - 2
            if confirming_condition(dq):
                return i - 2, True, STARTED_STR
            
    if last_candidate is not None: 
        return last_candidate, False, POSSIBLE_START_STR
    while len(dq) >= 2: # check remaining values in `dq` for possible start
        if candidate_condition(dq):
            return len(year_data) - len(dq) + 1, False, POSSIBLE_START_STR
        dq.popleft()
    return np.NaN, False, NO_START_STR

def get_start_of_season(data: pd.Series, clim_avg: pd.Series, sos_parameters: dict, properties: Properties):
    if sos_parameters["method"] is None:
        raise ValueError("SOS method not specified")
    elif sos_parameters["method"] == "fixed":
        current_sos = get_sos_fixed(data, sos_parameters['first_threshold'], sos_parameters['second_threshold'])
        clim_avg_sos = get_sos_fixed(clim_avg, sos_parameters['first_threshold'], sos_parameters['second_threshold'])
    elif sos_parameters["method"] == "pct_clim_avg":
        current_sos = get_sos_pct_clim_avg(data, clim_avg, sos_parameters['first_threshold'], sos_parameters['second_threshold'])
        clim_avg_sos = get_sos_pct_difference(clim_avg, 20, 50)
    else:
        raise ValueError(f"Unknown SOS method: {sos_parameters['method']}")

    sos_index_current, started_current, sos_class_current = current_sos
    sos_index_avg, started_avg, sos_class_avg = clim_avg_sos
    
    sos_index_avg += properties.season_start_index
    sos_index_current += properties.season_start_index
    columns = properties.sub_season_ids
    if sos_class_avg == STARTED_STR:
        if sos_index_avg <= 3:
            sos_class_avg = u'≤Feb-1'
        elif sos_index_avg >= 21:
            sos_class_avg = u'≥Aug-1'
        else:
            sos_class_avg = columns[sos_index_avg]

    if sos_class_current == STARTED_STR:
        if sos_index_current <= 3:
            sos_class_current = u'≤Feb-1'
        elif sos_index_current >= 21:
            sos_class_current = u'≥Aug-1'
        else:
            sos_class_current = columns[sos_index_current]

    sos_anomaly = sos_index_current - sos_index_avg
    if sos_index_current > 0 and not started_current:
        sos_anomaly_class = LATE_STR
    elif not started_avg or not started_current:
        sos_anomaly_class = YET_TO_START_STR
    # elif started_avg and not started_current:
    #     sos_anomaly_class = YET_TO_START_STR
    # elif sos_index_avg == np.NAN:
    #     # sos_anomaly_class = NO_REFERENCE_STR
    else:
        if sos_anomaly <= -4:
            sos_anomaly_class = f'≥4 {properties.period_unit_id}s Early'
        elif sos_anomaly >= 4:
            sos_anomaly_class = f'≥4 {properties.period_unit_id}s Late'
        elif sos_anomaly == 0:
            sos_anomaly_class = 'Average'
        else:
            sos_anomaly_class = f'{abs(sos_anomaly)} {properties.period_unit_id}s {"Late" if sos_anomaly > 0 else "Early"}'

    result = {
            'Start of Season Raw': sos_index_current,
            'Start of Season': sos_class_current,
            'Start of Season of Avg. Raw': sos_index_avg,
            'Start of Season of Avg.': sos_class_avg,
            'Start of Season Anomaly Raw': sos_anomaly,
            'Start of Season Anomaly': sos_anomaly_class,
    }
    return result