from numpy import ndarray
from numpy import split
import re
from ..commons import yearly_periods
from .Season import Season

class Place:
    timestamps = []
    def __init__(self, place_id, timeseries) -> None:
        self.place_id = place_id
        self.seasons = {}
        self.timeseries = timeseries
        split_seasons, self.current_season, period_unit, self.current_seasons_id, timestamp_start = self.parse_timeseries(timeseries)
        self.current_season: ndarray

        Season.season_unit = period_unit
        period_lenght = yearly_periods[period_unit]
        slice_range = (timestamp_start, timestamp_start+4) # slice of year number from id
        for i, data in enumerate(split_seasons):
            season_id = self.timestamps[i*period_lenght][slice_range[0]:slice_range[1]]
            self.seasons[season_id] = Season(season_id, data)
    
    def parse_timeseries(self, timeseries: ndarray) -> tuple:
        first = self.timestamps[0]
        match = re.search(r"\d{6}", first)
        if match is None:
            raise(RuntimeError('Columns must contain a six(6) digit number.'))
        timestamp_start = match.start()
        year_range = (timestamp_start, timestamp_start+4)
        first_year = first[year_range[0]:year_range[1]]

        period_lenght = 0
        period_unit = None
        for period, lenght in  yearly_periods.items():
            offset_year = self.timestamps[lenght][year_range[0]:year_range[1]]
            if first_year != offset_year:
                period_unit = period
                period_lenght = lenght
                break
        
        n_seasons = len(self.timestamps) // period_lenght
        current_season_index = n_seasons*period_lenght
        current_season_id = self.timestamps[current_season_index][year_range[0]:year_range[1]]
        print(n_seasons, current_season_index, current_season_id)
        return (
                split(timeseries[:current_season_index], n_seasons),
                timeseries[current_season_index:],
                period_unit,
                current_season_id,
                timestamp_start,
                )