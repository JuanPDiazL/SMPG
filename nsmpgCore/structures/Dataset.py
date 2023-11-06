from .Place import Place
from .Season import Season
import json
# test
class Dataset:
    def __init__(self, name: str, dataset: dict, col_names: list) -> None:
        self.name = name

        Place.timestamps = col_names
        self.places = {}
        for place, timeseries in dataset.items():
            self.places[str(place)] = Place(str(place), timeseries)

    def to_json(self, path, filename):
        data_dict = {}
        for place_id, place in self.places.items():
            place: Place
            place_dict = {}
            print(place.place_id.__class__, place.place_id)
            for season_id, season in place.seasons.items():
                season: Season
                place_dict[season_id] = season.data.tolist()
            place_dict[place.current_seasons_id] = place.current_season.tolist()
            data_dict[place_id] = place_dict

        with open(f'{path}/{filename}.js', 'w') as js_data_wrapper:
            json_str = json.dumps(data_dict)
            js_data_wrapper.write(f'var data = {json_str};')