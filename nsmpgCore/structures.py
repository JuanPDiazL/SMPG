from numpy import ndarray
import numpy as np
from .commons import *

# options for the computation
class Options:
    def __init__(self, climatology_start=None, climatology_end=None,
                 season_start=None, season_end=None, cross_years=None, selected_years=None,
                 output_types=None):
        self.climatology_start: str = climatology_start # year string. ej. '2021'
        self.climatology_end: str = climatology_end

        self.season_start: str = season_start
        self.season_end: str = season_end
        self.cross_years: bool = cross_years

        self.selected_years: list[str] = selected_years
        self.output_types: list[str] = output_types

    def overwrite(self, options: object):
        options = options.__dict__
        # Iterate over keys
        for key in self.__dict__:
            # If the value in dict1 is None, replace it with the value from dict2
            if options[key] is not None and key in options:
                self.__dict__[key] = options[key]

# properties of the dataset
class Properties:
    def __init__(self, properties_dict: dict=None) -> None:
        self.period_unit_id: str
        self.period_length: int
        self.season_quantity: int

        self.place_ids : list[str]
        self.year_ids: list[str]
        self.climatology_year_ids: list[str]
        self.selected_year_ids: list[str]
        
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

# stores and processes all the information in the dataset
# a dataset contains data of places
class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list[str], options: Options=None) -> None:
        self.name = name
        self.timestamps = col_names
        
        self.properties = Properties(properties_dict=parse_timestamps(self.timestamps))
        if options is None:
            self.options = Options( # default options
                climatology_start=self.properties.year_ids[0],
                climatology_end=self.properties.year_ids[-1],
                season_start='Jan-1',
                season_end='Dec-3',
                cross_years=False
                )
        else: self.options = options
        
        if self.options.cross_years:
            default_sub_seasons = define_seasonal_dict(6)
            self.season_shift = (yearly_periods[self.properties.period_unit_id] // 2)
            self.properties.year_ids = get_cross_years(self.properties.year_ids)
            self.properties.current_season_id = get_cross_years([self.properties.current_season_id])
        else:
            default_sub_seasons = define_seasonal_dict()
            self.season_shift = 0
            self.properties.year_ids = self.properties.year_ids

        if self.options.cross_years and (self.properties.current_season_length <= self.season_shift):
            self.properties.current_season_id = self.properties.year_ids.pop()
            self.split_quantity = self.properties.season_quantity - 1
            self.climatology_end_index = self.season_shift + self.properties.current_season_index - yearly_periods[self.properties.period_unit_id]
            self.properties.current_season_length = yearly_periods[self.properties.period_unit_id] + yearly_periods[self.properties.period_unit_id]
        else:
            self.split_quantity = self.properties.season_quantity
            self.climatology_end_index = self.season_shift + self.properties.current_season_index
            self.properties.current_season_length = yearly_periods[self.properties.period_unit_id]
        self.properties.climatology_year_ids = slice_by_element(self.properties.year_ids, self.options.climatology_start, self.options.climatology_end)
        self.properties.sub_season_ids = default_sub_seasons
        self.properties.sub_season_monitoring_ids = slice_by_element(default_sub_seasons, self.options.season_start, self.options.season_end)
        self.properties.sub_season_offset = default_sub_seasons.index(self.options.season_start)
        self.properties.place_ids = list(dataset.keys())

        self.season_start_index = default_sub_seasons.index(self.options.season_start)
        self.season_end_index = default_sub_seasons.index(self.options.season_end)+1
        self.current_season_trim_index = min(self.properties.current_season_length, self.season_end_index)

        # print(f'{self.properties.__dict__}\n{self.split_quantity}\n{self.climatology_end_index}\n')

        self.places: dict[str, Place] = {}
        for place, timeseries in dataset.items():
            self.places[place] = Place(place, timeseries, self)
    
    def place_stats_to_dict(self):
        place_data_dict = {}
        for place_id, place in self.places.items():
            place_stats = place.place_stats
            place_data_dict[place_id] = dict(map(lambda v: (v[0], v[1].tolist()), place_stats.items()))

        return place_data_dict
    
    def season_stats_to_dict(self):
        seasonal_data_dict = {}
        for place_id, place in self.places.items():
            season_stats = place.seasonal_stats
            seasonal_data_dict[place_id] = dict(map(lambda v: (v, {}), season_stats.keys()))
            for key in season_stats.keys():
                seasonal_data_dict[place_id][key] = dict(map(lambda v: (v[0], v[1].tolist()), season_stats[key].items()))
        return seasonal_data_dict

# a place contains data for the seasons and computes its stats
class Place:
    def __init__(self, place_id: str, timeseries: ndarray, parent: Dataset) -> None:
        self.id = place_id
        self.timeseries = timeseries
        self.parent = parent
        split_seasons: list[ndarray] = np.split(timeseries[parent.season_shift : parent.climatology_end_index], 
                              parent.split_quantity)
        self.current_season: ndarray = timeseries[parent.climatology_end_index:]
        self.current_season_monitoring = self.current_season[parent.season_start_index:parent.current_season_trim_index]
        # compensation for slice out of bounds
        self.current_season_monitoring = self.current_season_monitoring if self.current_season_monitoring.__len__() != 0 else np.array([0])
        # build seasons
        # self.seasons: dict[str, ndarray] = {}
        self.seasons_climatology: dict[str, ndarray] = {}
        self.seasons_monitoring: dict[str, ndarray] = {}
        for i, data in enumerate(split_seasons):
            # variables for climatology filter
            season_id = parent.properties.year_ids[i]
            # self.seasons[season_id] = data
            self.seasons_monitoring[season_id] = data[parent.season_start_index:parent.season_end_index]
            if season_id in self.parent.properties.climatology_year_ids:
                self.seasons_climatology[season_id] = data
        self.place_stats, self.seasonal_stats = self.get_stats()

    def get_stats(self):
        seasonal_accumulations = np.cumsum(list(self.seasons_monitoring.values()), axis=1)
        seasonal_sums = seasonal_accumulations[:, -1]
        seasonal_current_sums = seasonal_accumulations[:, self.current_season_monitoring.__len__()-1]
        seasonal_ensemble = [get_ensemble(self.current_season_monitoring, s) for s in list(self.seasons_monitoring.values())]
        ensemble_sums = np.array([e[-1] for e in seasonal_ensemble])

        seasonal_lta = operate_column(seasonal_accumulations, np.average)
        seasonal_pctls = percentiles_to_values(seasonal_sums, [33, 67])
        ensemble_ltm = operate_column(seasonal_ensemble, np.median)
        ensemble_pctls = percentiles_to_values(ensemble_sums, [33, 67])
        ensemble_pctl_probabilities = np.array([
            np.count_nonzero(ensemble_sums < seasonal_pctls[0]) / len(ensemble_sums),
            np.count_nonzero((ensemble_sums >= seasonal_pctls[0]) & (ensemble_sums < seasonal_pctls[1])) / len(ensemble_sums),
            np.count_nonzero(ensemble_sums >= seasonal_pctls[1]) / len(ensemble_sums),
        ])

        place_stats = {
            'Pctls. per Year': percentiles_from_values(seasonal_current_sums),
            'Drought Severity Pctls.': percentiles_to_values(seasonal_current_sums, (3, 6, 11, 21, 31)),
            'Pctls.': seasonal_pctls,
            'LTM': operate_column(seasonal_accumulations, np.median),
            'LTA': seasonal_lta,
            'Avg.': operate_column(list(self.seasons_climatology.values()), np.average),
            'E. LTM': ensemble_ltm,
            'E. Pctls.': ensemble_pctls,
            'E. Probabilities': ensemble_pctl_probabilities,
            'St. Dev.': operate_column(seasonal_accumulations, np.std),
            'Current Season': self.current_season,
            'Current Season Accumulation': np.cumsum(self.current_season_monitoring),
        }
        seasonal_stats = {
            'Sum': dict(map(lambda v: (v[0], v[1]), zip(self.seasons_monitoring.keys(), seasonal_accumulations))),
            'Ensemble Sum': dict(map(lambda v: (v[0], get_ensemble(self.current_season_monitoring, v[1])), zip(self.seasons_monitoring.keys(), list(self.seasons_monitoring.values())))),
        }
        return place_stats, seasonal_stats
    
    def get_season_stats(self, data):
        to_compute = {
            'Sum': np.cumsum(data),
            'Ensemble Sum': get_ensemble(self.current_season_monitoring, data),
        }
        return to_compute
    