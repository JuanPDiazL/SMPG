import json
from numpy import split, ndarray
from dataclasses import dataclass

from .commons import yearly_periods, get_year_slice, parse_timestamps

class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list[str]) -> None:
        self.name = name
        self.timestamps = col_names
        self.seasonal_properties = parse_timestamps(self.timestamps)

        self.places = {}
        for place, timeseries in dataset.items():
            self.places[place] = Place(place, timeseries, self)

    def to_json(self, path, filename):
        data_dict = {}
        for place_id, place in self.places.items():
            place: Place
            place_dict = {}
            print(place.place_id.__class__, place.place_id)
            for season_id, season in place.seasons.items():
                season: Season
                place_dict[season_id] = season.data.tolist()
            place_dict[self.seasonal_properties.current_season_key] = place.current_season.tolist()
            data_dict[place_id] = place_dict

        with open(f'{path}/{filename}.js', 'w') as js_data_wrapper:
            json_str = json.dumps(data_dict)
            js_data_wrapper.write(f'var data = {json_str};')

class Place:
    def __init__(self, place_id: str, timeseries: list, parent_dataset: Dataset) -> None:
        self.place_id = place_id
        self.timeseries = timeseries
        self.parent_dataset = parent_dataset
        split_seasons = split(timeseries[:self.parent_dataset.seasonal_properties.current_season_index], 
                              self.parent_dataset.seasonal_properties.season_quantity)
        self.current_season = timeseries[self.parent_dataset.seasonal_properties.current_season_index:]

        self.seasons = {}
        period_lenght = yearly_periods[self.parent_dataset.seasonal_properties.period_unit]
        for i, data in enumerate(split_seasons):
            season_id = get_year_slice(self.parent_dataset.timestamps[i*period_lenght], self.parent_dataset.seasonal_properties.timestamp_start_index)
            self.seasons[season_id] = Season(season_id, data, self.parent_dataset, self)

@dataclass
class Season:
    id: str
    data: ndarray
    parent_dataset: Dataset
    parent_place: Place