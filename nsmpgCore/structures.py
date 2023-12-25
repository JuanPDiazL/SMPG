import json
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
            data_dict[place_id] = {}
            for season_id, season in place.seasons.items():
                data_dict[place_id][season_id] = dict(map(lambda v: (v[0], v[1].tolist()), season.get_stats().items()))
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
        seasonal_scalars = [s.scalar for s in self.seasons.values()]
        seasonal_cum = [i.get_stats()['Sum'] for i in self.seasons.values()]
        to_compute = {
            'Yr. Pctls.': percentile(seasonal_scalars),
            'Drought Severity Pctls.': percentiles_to_values(seasonal_scalars),
            'LTM': operate_parallel(seasonal_cum, np.median),
            'LTA': operate_parallel(seasonal_cum, np.average),
            'St. Dev.': operate_parallel(seasonal_cum, np.std),
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

    def get_stats(self):
        to_compute = {
            'Sum': np.cumsum(self.data),
            'Ensemble Sum': ensemble_sum(self.parent.current_season, self.data),
        }
        return to_compute