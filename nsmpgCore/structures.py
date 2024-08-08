from numpy import ndarray
import numpy as np
from .utils import *

# TODO: remove conversion methods from this class to dedicated functions
class Dataset:
    """A class to represent a dataset.

    Attributes:
        name (str): Name of the dataset.
        timestamps (list[str]): List of column names from the dataset.
        properties (Properties): Properties of the dataset.
        parameters (Parameters): Computation parameters.
        places (dict[str, Place]): Dictionary of place objects.
    """
    def __init__(self, name: str, dataset: dict, col_names: list[str], parameters: Parameters) -> None:
        """Constructor

        Args:
            name (str): name of the dataset.
            dataset (dict): data contained in the dataset.
            col_names (list[str]): column names from the dataset.
            parameters (Parameters): computation parameters.
        """
        self.name = name
        self.timestamps = col_names
        
        self.properties = Properties(properties_dict=parse_timestamps(self.timestamps))
        self.parameters = parameters
        
        default_sub_seasons = define_seasonal_dict(self.parameters.cross_years)
        if self.parameters.cross_years:
            self.season_shift = (yearly_periods[self.properties.period_unit_id] // 2)
            self.properties.year_ids = get_cross_years(self.properties.year_ids)
            self.properties.current_season_id = get_cross_years([self.properties.current_season_id])[0]
        else:
            self.season_shift = 0
            self.properties.year_ids = self.properties.year_ids

        if self.parameters.cross_years and (self.properties.current_season_length <= self.season_shift):
            self.properties.current_season_id = self.properties.year_ids.pop()
            self.split_quantity = self.properties.season_quantity - 1
            self.climatology_end_index = self.season_shift + self.properties.current_season_index - yearly_periods[self.properties.period_unit_id]
            self.properties.current_season_length += self.season_shift
        else:
            self.split_quantity = self.properties.season_quantity
            self.climatology_end_index = self.season_shift + self.properties.current_season_index
            self.properties.current_season_length -= self.season_shift
        self.properties.climatology_year_ids = slice_by_element(self.properties.year_ids, self.parameters.climatology_start, self.parameters.climatology_end)
        self.properties.sub_season_ids = default_sub_seasons
        self.properties.selected_years = self.parameters.selected_years
        self.properties.sub_season_monitoring_ids = slice_by_element(default_sub_seasons, self.parameters.season_start, self.parameters.season_end)
        self.properties.sub_season_offset = default_sub_seasons.index(self.parameters.season_start)
        self.properties.place_ids = list(dataset.keys())

        self.season_start_index = default_sub_seasons.index(self.parameters.season_start)
        self.season_end_index = default_sub_seasons.index(self.parameters.season_end)+1
        self.current_season_trim_index = min(self.properties.current_season_length, self.season_end_index) - parameters.is_forecast
        

        self.places: dict[str, Place] = {}
        for place, timeseries in dataset.items():
            self.places[place] = Place(place, timeseries, self)
    
    def place_stats_to_dict(self, type='all'):
        """Convert place statistics to a dictionary.

        Args:
            type (str): Type of statistics. Default is 'all'.

        Returns:
            dict: Dictionary containing place statistics.
        """
        place_data_dict = {}
        for place_id, place in self.places.items():
            if type == 'selected': place_stats = place.selected_years_place_stats
            else: place_stats = place.place_stats
            place_data_dict[place_id] = dict(map(lambda v: (v[0], v[1].tolist() if isinstance(v[1], np.ndarray) else v), place_stats.items()))
        return place_data_dict
    
    def season_stats_to_dict(self, type='all'):
        """Convert seasonal statistics to a dictionary.

        Args:
            type (str): Type of statistics. Default is 'all'.

        Returns:
            dict: Dictionary containing seasonal statistics.
        """
        seasonal_data_dict = {}
        for place_id, place in self.places.items():
            if type =='selected': season_stats = place.selected_years_seasonal_stats
            else: season_stats = place.seasonal_stats
            seasonal_data_dict[place_id] = dict(map(lambda v: (v, {}), season_stats.keys()))
            for key in season_stats.keys():
                seasonal_data_dict[place_id][key] = dict(map(lambda v: (v[0], v[1].tolist() if isinstance(v[1], np.ndarray) else v), season_stats[key].items()))
        return seasonal_data_dict

class Place:
    """Represents a place with associated time series data.

    Attributes:
        id (str): Unique identifier of the place.
        timeseries (ndarray): Time series data for the place.
        parent (Dataset): Parent dataset that contains this place.
        current_season (ndarray): Current season's data.
        forecast_value (float or None): Forecast value in the current season.
        seasons_monitoring (dict[str, ndarray]): Data within the monitoring 
            season.
        seasons_monitoring_selected (dict[str, ndarray]): Selected year's data 
            within the monitoring season.
        seasons_monitoring_climatology (dict[str, ndarray]): Climatology data 
            within the monitoring season.
        place_stats (tuple): Statistics for the place.
        seasonal_stats (tuple): Seasonal statistics.
        selected_years_place_stats (tuple): Selected years place statistics.
        selected_years_seasonal_stats (tuple): Selected years seasonal 
            statistics.
    """
        
    def __init__(self, place_id: str, timeseries: ndarray, parent: Dataset) -> None:
        self.id = place_id
        self.timeseries = timeseries
        self.parent = parent
        split_seasons: list[ndarray] = np.split(timeseries[parent.season_shift : parent.climatology_end_index], 
                              parent.split_quantity)
        self.current_season: ndarray = timeseries[parent.climatology_end_index : ]
        if parent.parameters.is_forecast: 
            self.forecast_value = self.current_season[-1]
            self.current_season = self.current_season[:-1]
        else: self.forecast_value = None
        self.current_season_monitoring = self.current_season[parent.season_start_index:parent.current_season_trim_index]
        
        self.similar_seasons = get_similar_years(self.current_season, 
                                            split_seasons, 
                                            parent.properties.year_ids,
                                            parent.parameters.use_pearson)
        if isinstance(parent.properties.selected_years, str):
            self.selected_years = self.similar_seasons[:int(parent.properties.selected_years)]
        if isinstance(parent.properties.selected_years, list):
            self.selected_years = parent.properties.selected_years
        # build seasons
        # self.seasons: dict[str, ndarray] = {}
        self.seasons_climatology: dict[str, ndarray] = {}
        self.seasons_monitoring: dict[str, ndarray] = {}
        self.seasons_monitoring_selected: dict[str, ndarray] = {}
        self.seasons_monitoring_climatology: dict[str, ndarray] = {}
        for i, data in enumerate(split_seasons):
            # variables for climatology filter
            season_id = parent.properties.year_ids[i]
            # self.seasons[season_id] = data
            self.seasons_monitoring[season_id] = data[parent.season_start_index:parent.season_end_index]
            if season_id in self.selected_years:
                self.seasons_monitoring_selected[season_id] = self.seasons_monitoring[season_id]
            if season_id in self.parent.properties.climatology_year_ids:
                self.seasons_monitoring_climatology[season_id] = self.seasons_monitoring[season_id]
                self.seasons_climatology[season_id] = data
        self.place_stats, self.seasonal_stats, self.selected_years_place_stats, self.selected_years_seasonal_stats = self.get_stats()

    def get_place_stats(self, seasonal_accumulations, seasonal_ensemble, common_stats):
        """Calculates and returns the place statistics for a given season.

        Args:
            seasonal_accumulations (ndarray): The accumulated values.
            seasonal_ensemble (list or tuple): The ensemble values.
            common_stats (dict): The common statistics.

        Returns:
            dict: The calculated place statistics.
        """
        current_accumulation_mon = np.cumsum(self.current_season_monitoring)
        current_index = self.current_season_monitoring.__len__()-1
        seasonal_current_sums = common_stats['seasonal_accumulations'][:, current_index]
        seasonal_sums = np.array([e[-1] for e in seasonal_accumulations])
        ensemble_sums = np.array([e[-1] for e in seasonal_ensemble])
        seasonal_lta = operate_column(seasonal_accumulations, np.average)
        seasonal_pctls = common_stats['climatology_seasonal_pctls']
        ensemble_median = operate_column(seasonal_ensemble, np.median)
        ensemble_lta = operate_column(seasonal_ensemble, np.average)
        ensemble_pctls = percentiles_to_values(ensemble_sums, [33, 67])
        ensemble_pctl_probabilities = np.array([
            np.count_nonzero(ensemble_sums < seasonal_pctls[0]) / len(ensemble_sums),
            np.count_nonzero((ensemble_sums >= seasonal_pctls[0]) & (ensemble_sums < seasonal_pctls[1])) / len(ensemble_sums),
            np.count_nonzero(ensemble_sums >= seasonal_pctls[1]) / len(ensemble_sums),
        ])
        place_stats = {
            # 'Pctls. per Year': percentiles_from_values(seasonal_current_sums),
            'Current Season Pctl.': percentiles_from_values(seasonal_current_sums, [current_accumulation_mon[-1]]),
            'Drought Severity Pctls.': percentiles_to_values(seasonal_current_sums, (3, 6, 11, 21, 33, 67)),
            'Pctls.': seasonal_pctls,
            'Median': operate_column(seasonal_accumulations, np.median),
            'LTA': seasonal_lta,
            'C. Dk./LTA': current_accumulation_mon/seasonal_lta[:current_index+1],
            'Avg.': operate_column(list(self.seasons_climatology.values()), np.average),
            'Ensemble Med.': ensemble_median,
            'E. LTA': ensemble_lta,
            'Ensemble Med./LTA': ensemble_median/seasonal_lta,
            'Ensemble Med. Pctl.': percentiles_from_values(seasonal_sums, [ensemble_median[-1]]),
            'E. Pctls.': ensemble_pctls,
            'E. Probabilities': ensemble_pctl_probabilities,
            'St. Dev.': operate_column(seasonal_accumulations, np.std),
            'Current Season': self.current_season,
            'Current Season Accumulation': current_accumulation_mon,
            'forecast': np.array([self.forecast_value]),
        }
        return place_stats

    def get_seasonal_stats(self, seasonal_accumulations, seasonal_ensemble, year_ids):
        """Calculates and returns the seasonal statistics.

        Args:
            seasonal_accumulations (ndarray): The accumulated values.
            seasonal_ensemble (list or tuple): The ensemble values.
            year_ids (list or tuple): The year IDs.

        Returns:
            dict: The calculated seasonal statistics.
        """
        seasonal_stats = {
            'Sum': dict(map(lambda v: (v[0], v[1]), zip(year_ids, seasonal_accumulations))),
            'Ensemble Sum': dict(map(lambda v: (v[0], v[1]), zip(year_ids, seasonal_ensemble))),
        }
        return seasonal_stats

    def get_stats(self):
        """Calculates and returns the overall statistics.

        Returns:
            tuple: A tuple containing the place statistics, seasonal statistics,
                selected years place statistics, and selected years seasonal 
                statistics.
        """
        seasonal_accumulations = np.cumsum(list(self.seasons_monitoring.values()), axis=1)
        seasonal_ensemble = [get_ensemble(self.current_season_monitoring, s) for s in list(self.seasons_monitoring.values())]

        climatology_seasonal_accumulations = np.cumsum(list(self.seasons_monitoring_climatology.values()), axis=1)
        climatology_seasonal_ensemble = [get_ensemble(self.current_season_monitoring, s) for s in list(self.seasons_monitoring_climatology.values())]
        climatology_seasonal_sums = climatology_seasonal_accumulations[:, -1]
        climatology_seasonal_pctls = percentiles_to_values(climatology_seasonal_sums, [33, 67])

        selected_years_seasonal_accumulations = np.cumsum(list(self.seasons_monitoring_selected.values()), axis=1)
        selected_years_seasonal_ensemble = [get_ensemble(self.current_season_monitoring, s) for s in list(self.seasons_monitoring_selected.values())]

        common_stats = {
            'climatology_seasonal_pctls': climatology_seasonal_pctls,
            'seasonal_accumulations': seasonal_accumulations,
            'Current Season Full Accumulation': np.cumsum(self.current_season),
        }
        return (self.get_place_stats(climatology_seasonal_accumulations, climatology_seasonal_ensemble, common_stats),
                self.get_seasonal_stats(seasonal_accumulations, seasonal_ensemble, self.seasons_monitoring.keys()),
                self.get_place_stats(selected_years_seasonal_accumulations, selected_years_seasonal_ensemble, common_stats),
                self.get_seasonal_stats(selected_years_seasonal_accumulations, selected_years_seasonal_ensemble, self.seasons_monitoring_selected.keys()),
                )