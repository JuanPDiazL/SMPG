from numpy import ndarray
import numpy as np
from .commons import *

# stores and processes all the information in the dataset
# a dataset contains data of places
class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list[str], options: Options) -> None:
        self.name = name
        self.timestamps = col_names
        
        self.properties = Properties(properties_dict=parse_timestamps(self.timestamps))
        self.options = options
        
        default_sub_seasons = define_seasonal_dict(self.options.cross_years)
        if self.options.cross_years:
            self.season_shift = (yearly_periods[self.properties.period_unit_id] // 2)
            self.properties.year_ids = get_cross_years(self.properties.year_ids)
            self.properties.current_season_id = get_cross_years([self.properties.current_season_id])
        else:
            self.season_shift = 0
            self.properties.year_ids = self.properties.year_ids

        if self.options.cross_years and (self.properties.current_season_length <= self.season_shift):
            self.properties.current_season_id = self.properties.year_ids.pop()
            self.split_quantity = self.properties.season_quantity - 1
            self.climatology_end_index = self.season_shift + self.properties.current_season_index - yearly_periods[self.properties.period_unit_id]
            self.properties.current_season_length += self.season_shift
        else:
            self.split_quantity = self.properties.season_quantity
            self.climatology_end_index = self.season_shift + self.properties.current_season_index
            self.properties.current_season_length -= self.season_shift
        self.properties.climatology_year_ids = slice_by_element(self.properties.year_ids, self.options.climatology_start, self.options.climatology_end)
        self.properties.sub_season_ids = default_sub_seasons
        self.properties.selected_years = self.options.selected_years
        self.properties.sub_season_monitoring_ids = slice_by_element(default_sub_seasons, self.options.season_start, self.options.season_end)
        self.properties.sub_season_offset = default_sub_seasons.index(self.options.season_start)
        self.properties.place_ids = list(dataset.keys())

        self.season_start_index = default_sub_seasons.index(self.options.season_start)
        self.season_end_index = default_sub_seasons.index(self.options.season_end)+1
        self.current_season_trim_index = min(self.properties.current_season_length, self.season_end_index) - options.is_forecast
        

        self.places: dict[str, Place] = {}
        for place, timeseries in dataset.items():
            self.places[place] = Place(place, timeseries, self)
    
    def place_stats_to_dict(self, type='all'):
        place_data_dict = {}
        for place_id, place in self.places.items():
            if type == 'selected': place_stats = place.selected_years_place_stats
            else: place_stats = place.place_stats
            place_data_dict[place_id] = dict(map(lambda v: (v[0], v[1].tolist() if isinstance(v[1], np.ndarray) else v), place_stats.items()))
        return place_data_dict
    
    def season_stats_to_dict(self, type='all'):
        seasonal_data_dict = {}
        for place_id, place in self.places.items():
            if type =='selected': season_stats = place.selected_years_seasonal_stats
            else: season_stats = place.seasonal_stats
            seasonal_data_dict[place_id] = dict(map(lambda v: (v, {}), season_stats.keys()))
            for key in season_stats.keys():
                seasonal_data_dict[place_id][key] = dict(map(lambda v: (v[0], v[1].tolist() if isinstance(v[1], np.ndarray) else v), season_stats[key].items()))
        return seasonal_data_dict

# a place contains data for the seasons and computes its stats
class Place:
    def __init__(self, place_id: str, timeseries: ndarray, parent: Dataset) -> None:
        self.id = place_id
        self.timeseries = timeseries
        self.parent = parent
        split_seasons: list[ndarray] = np.split(timeseries[parent.season_shift : parent.climatology_end_index], 
                              parent.split_quantity)
        self.current_season: ndarray = timeseries[parent.climatology_end_index : ]
        if parent.options.is_forecast: 
            self.forecast_value = self.current_season[-1]
            self.current_season = self.current_season[:-1]
        else: self.forecast_value = None
        self.current_season_monitoring = self.current_season[parent.season_start_index:parent.current_season_trim_index]
        # compensation for slice out of bounds
        self.current_season_monitoring = self.current_season_monitoring if self.current_season_monitoring.__len__() != 0 else np.array([0])
        
        
        self.similar_seasons = get_similar_years(self.current_season, 
                                            split_seasons, 
                                            parent.properties.year_ids,
                                            parent.options.use_pearson)
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
        current_accumulation_mon = np.cumsum(self.current_season_monitoring)
        current_index = self.current_season_monitoring.__len__()-1
        seasonal_current_sums = common_stats['seasonal_accumulations'][:, current_index]
        seasonal_sums = np.array([e[-1] for e in seasonal_accumulations])
        ensemble_sums = np.array([e[-1] for e in seasonal_ensemble])
        seasonal_lta = operate_column(seasonal_accumulations, np.average)
        seasonal_pctls = common_stats['climatology_seasonal_pctls']
        ensemble_ltm = operate_column(seasonal_ensemble, np.median)
        ensemble_lta = operate_column(seasonal_ensemble, np.average)
        ensemble_pctls = percentiles_to_values(ensemble_sums, [33, 67])
        ensemble_pctl_probabilities = np.array([
            np.count_nonzero(ensemble_sums < seasonal_pctls[0]) / len(ensemble_sums),
            np.count_nonzero((ensemble_sums >= seasonal_pctls[0]) & (ensemble_sums < seasonal_pctls[1])) / len(ensemble_sums),
            np.count_nonzero(ensemble_sums >= seasonal_pctls[1]) / len(ensemble_sums),
        ])
        place_stats = {
            # 'Pctls. per Year': percentiles_from_values(seasonal_current_sums),
            'Current Season Pctl.': percentiles_from_values(seasonal_current_sums, [common_stats['Current Season Full Accumulation'][-1]]),
            'Drought Severity Pctls.': percentiles_to_values(seasonal_current_sums, (3, 6, 11, 21, 31, 67)),
            'Pctls.': seasonal_pctls,
            'LTM': operate_column(seasonal_accumulations, np.median),
            'LTA': seasonal_lta,
            'C. Dk./LTA': current_accumulation_mon/seasonal_lta[:current_index+1],
            'Avg.': operate_column(list(self.seasons_climatology.values()), np.average),
            'E. LTM': ensemble_ltm,
            'E. LTA': ensemble_lta,
            'E. LTM/LTA': ensemble_ltm/seasonal_lta,
            'E. LTM Pctl.': percentiles_from_values(seasonal_sums, [ensemble_ltm[-1]]),
            'E. Pctls.': ensemble_pctls,
            'E. Probabilities': ensemble_pctl_probabilities,
            'St. Dev.': operate_column(seasonal_accumulations, np.std),
            'Current Season': self.current_season,
            'Current Season Accumulation': current_accumulation_mon,
            'forecast': np.array([self.forecast_value]),
        }
        return place_stats

    def get_seasonal_stats(self, seasonal_accumulations, seasonal_ensemble, year_ids):
        seasonal_stats = {
            'Sum': dict(map(lambda v: (v[0], v[1]), zip(year_ids, seasonal_accumulations))),
            'Ensemble Sum': dict(map(lambda v: (v[0], v[1]), zip(year_ids, seasonal_ensemble))),
        }
        return seasonal_stats

    def get_stats(self):
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