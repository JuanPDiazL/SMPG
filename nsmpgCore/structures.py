import json
from numpy import ndarray
import numpy as np
from dataclasses import dataclass
from .commons import operate_each, percentile, percentiles_to_values, yearly_periods, get_year_slice, parse_timestamps, to_scalar, operate_parallel

class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list[str]) -> None:
        self.name = name
        self.timestamps = col_names
        
        self.seasonal_properties = parse_timestamps(self.timestamps)
        self.places: dict[str, Place] = {}
        for place, timeseries in dataset.items():
            self.places[place] = Place(place, timeseries, self)

    def to_json(self, path, filename, kind='data'):
        data_dict = {}
        for place_key, place in self.places.items():
            place_dict = {}
            if kind == 'data':
                for season_key, season in place.seasons.items():
                    place_dict[season_key] = season.data.tolist()
                place_dict[self.seasonal_properties.current_season_key] = place.current_season.tolist()
                data_dict[place_key] = place_dict
            elif kind == 'stats':
                data_dict[place_key] = {k: v.tolist() for k, v in place.get_stats().items()}

        with open(f'{path}/{filename}_{kind}.js', 'w') as js_data_wrapper:
            json_str = json.dumps(data_dict)
            js_data_wrapper.write(f'var {kind} = {json_str};')

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
        seasonal_cum = [i.get_stats()['sum'] for i in self.seasons.values()]
        print(seasonal_cum)
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
            'sum': np.cumsum(self.data),
        }
        return to_compute