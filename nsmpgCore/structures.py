from numpy import ndarray
import numpy as np
from .commons import *
from dataclasses import dataclass

class Options:
    def __init__(self, parameters=None, climatology_start=None, climatology_end=None,
                 season_start=None, season_end=None, selected_years=None,
                 output_types=None):
        self.climatology_start: str = climatology_start # year string. ej. '2021'
        self.climatology_end: str = climatology_end

        self.season_start: str = season_start
        self.season_end: str = season_end

        self.selected_years: list[str] = selected_years
        self.output_types: list[str] = output_types

        if parameters is not None:
            self.update(parameters)

    def update(self, parameters: dict):
        self.__dict__.update(parameters)

class Properties:
    def __init__(self, properties_dict: dict=None) -> None:
        self.timestamp_str_offset: int
        self.period_unit_id: str
        self.season_quantity: int
        self.year_ids: list[str]

        self.current_season_index: int
        self.current_season_id: str

        if properties_dict is not None:
            self.update(properties_dict)

    def update(self, properties: dict):
        self.__dict__.update(properties)

class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list[str], options: Options=None) -> None:
        self.name = name
        self.timestamps = col_names
        
        self.properties = Properties(properties_dict=parse_timestamps(self.timestamps))
        self.options = Options(climatology_start=self.properties.year_ids[0], climatology_end=self.properties.year_ids[-1])
        if options is not None:
            self.options = options
        
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

        split_seasons: list[ndarray] = np.split(timeseries[:self.parent.properties.current_season_index], 
                              self.parent.properties.season_quantity)
        self.current_season: ndarray = timeseries[self.parent.properties.current_season_index:]


        # construct the seasons
        self.seasons: dict[str, Season] = {}
        for i, data in enumerate(split_seasons):
            # variables for climatology filter
            start = int(self.parent.options.climatology_start)
            end = int(self.parent.options.climatology_end)
            season_id = self.parent.properties.year_ids[i]
            if int(season_id) in range(start, end+1):
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