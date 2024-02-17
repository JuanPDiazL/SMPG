from numpy import ndarray
import numpy as np
from .commons import *

class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list[str]) -> None:
        self.name = name
        self.timestamps = col_names
        
        self.seasonal_properties = parse_timestamps(self.timestamps)
        self.places: dict[str, Place] = {}
        for place, timeseries in dataset.items():
            self.places[place] = Place(place, timeseries, self)

    def raw_to_dict(self):
        data_dict = {}
        for place_id, place in self.places.items():
            data_dict[place_id] = {}
            for season_id, season in place.seasons.items():
                data_dict[place_id][season_id] = season.data.tolist()
        return data_dict
    
    def place_stats_to_dict(self):
        data_dict = {}
        for place_id, place in self.places.items():
            data_dict[place_id] = dict(map(lambda v: (v[0], v[1].tolist()), place.get_stats().items()))
        return data_dict
    
    def season_stats_to_dict(self):
        data_dict = {}
        for place_id, place in self.places.items():
            data_dict[place_id] = dict(map(lambda k: (k, {}), list(place.seasons.values())[1].get_stats().keys()))
            for season_id, season in place.seasons.items():
                for stat, values in season.get_stats().items():
                    data_dict[place_id][stat] = data_dict[place_id][stat] | {season_id: values.tolist()}

        return data_dict
    
    def get_children(self):
        return self.places

class Place:
    def __init__(self, place_id: str, timeseries: ndarray, parent_dataset: Dataset) -> None:
        self.id = place_id
        self.timeseries = timeseries
        self.parent = parent_dataset

        split_seasons: list[ndarray] = np.split(timeseries[:self.parent.seasonal_properties.current_season_index], 
                              self.parent.seasonal_properties.season_quantity)
        self.current_season: ndarray = timeseries[self.parent.seasonal_properties.current_season_index:]

        self.seasons: dict[str, Season] = {}
        period_lenght = yearly_periods[self.parent.seasonal_properties.period_unit]
        for i, data in enumerate(split_seasons):
            season_id = get_year_slice(self.parent.timestamps[i*period_lenght], self.parent.seasonal_properties.timestamp_start_index)
            self.seasons[season_id] = Season(season_id, data, self)

    def get_stats(self):
        season_values = [s.data for s in self.seasons.values()]
        season_stats = [s.get_stats() for s in self.seasons.values()]
        seasonal_cum = [s['Sum'] for s in season_stats]
        seasonal_current_sum_scalars = [c[self.current_season.__len__()-1] for c in seasonal_cum]
        accumulation_scalars = [c[-1] for c in seasonal_cum]
        seasonal_ensemble = [s['Ensemble Sum'] for s in season_stats]
        ensemble_scalars = [e[-1] for e in seasonal_ensemble]
        to_compute = {
            'Pctls. per Year': percentile(seasonal_current_sum_scalars),
            'Drought Severity Pctls.': percentiles_to_values(seasonal_current_sum_scalars, (3, 6, 11, 21, 31)),
            'Pctls.': percentiles_to_values(accumulation_scalars, [33, 67]),
            'LTM': operate_column_parallel(seasonal_cum, np.median),
            'LTA': operate_column_parallel(seasonal_cum, np.average),
            'Avg.': operate_column_parallel(season_values, np.average),
            'E. LTM': operate_column_parallel(seasonal_ensemble, np.median),
            'E. Pctls.': percentiles_to_values(ensemble_scalars, [33, 67]),
            'St. Dev.': operate_column_parallel(seasonal_cum, np.std),
            'Current Year': self.current_season,
        }
        return to_compute
    
    def get_children(self):
        return self.seasons

class Season:
    def __init__(self, id: str, data: ndarray, parent_place: Place) -> None:
        self.id = id
        self.data = data
        self.parent = parent_place
        self.scalar = to_scalar(data)
        self.scalar_current = to_scalar(data, self.parent.current_season.__len__())

    def get_stats(self):
        to_compute = {
            'Sum': np.cumsum(self.data),
            'Ensemble Sum': ensemble_sum(self.parent.current_season, self.data),
        }
        return to_compute