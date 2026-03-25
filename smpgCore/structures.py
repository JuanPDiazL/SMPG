import numpy as np
import pandas as pd
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
    def __init__(self, name: str, dataset: pd.DataFrame, col_names: list[str], parameters: Parameters) -> None:
        """Constructor

        Args:
            name (str): name of the dataset.
            dataset (DataFrame): data contained in the dataset.
            col_names (list[str]): column names from the dataset.
            parameters (Parameters): computation parameters.
        """
        self.name = name
        self.dataset = dataset
        self.timestamps = col_names
        
        self.properties = Properties(properties_dict=parse_timestamps(self.timestamps))
        self.parameters = parameters
        
        self.properties.dataset_name = name
        default_sub_seasons = define_seasonal_dict(self.parameters.cross_years, self.properties.period_unit_id)


        # calculation for year ids and season shift
        self.season_shift = 0
        if self.parameters.cross_years:
            self.season_shift = (yearly_periods[self.properties.period_unit_id] // 2)
            self.properties.year_ids = get_cross_years(self.properties.year_ids)
            self.properties.current_season_id = get_cross_years([self.properties.current_season_id])[0]

        # determines current season for cross years
        if self.parameters.cross_years and (self.properties.current_season_length <= self.season_shift):
            # pop last past year as current year
            self.properties.current_season_id = self.properties.year_ids.pop()
            self.split_quantity = self.properties.season_quantity - 1
            self.climatology_end_index = self.season_shift + self.properties.current_season_index - yearly_periods[self.properties.period_unit_id]
            self.properties.current_season_length += self.season_shift
        else:
            # keep current year
            self.split_quantity = self.properties.season_quantity
            self.climatology_end_index = self.season_shift + self.properties.current_season_index
            self.properties.current_season_length -= self.season_shift

        # more properties of the dataset are calculated
        self.properties.climatology_year_ids = slice_by_element(self.properties.year_ids, self.parameters.climatology_start, self.parameters.climatology_end)
        self.properties.sub_season_ids = default_sub_seasons
        self.properties.selected_years = self.parameters.selected_years
        self.properties.sub_season_monitoring_ids = slice_by_element(default_sub_seasons, self.parameters.season_start, self.parameters.season_end)
        self.properties.sub_season_offset = default_sub_seasons.index(self.parameters.season_start)
        self.properties.place_ids = dataset.index.astype(str).tolist()
        self.properties.season_start_index = default_sub_seasons.index(self.parameters.season_start)
        self.properties.season_end_index = default_sub_seasons.index(self.parameters.season_end)+1
        self.properties.current_season_trim_index = min(self.properties.current_season_length, self.properties.season_end_index) - parameters.forecast_length

        # create a dictionary with the places
        self.places: dict[str, Place] = {}
        for place, timeseries in dataset.iterrows():
            # print(place)
            self.places[place] = Place(place, timeseries, self)
    
class Place:
    """Represents a place with associated time series data.

    Attributes:
        id (str): Unique identifier of the place.
        parent (Dataset): Parent dataset that contains this place.
        current_season (Series): Current season's data.
        seasons_df (DataFrame): DataFrame of past seasons' data.
    """
        
    def __init__(self, place_id: str, timeseries: pd.Series, parent: Dataset) -> None:
        self.id = place_id
        indexes = parent.properties.year_ids
        columns = parent.properties.sub_season_ids
        # split timeseries into years
        self.current_season = timeseries[parent.climatology_end_index : ]
        self.current_season.index = columns[:len(self.current_season)]
        past_seasons = timeseries[parent.season_shift : parent.climatology_end_index]
        timeseries_reshaped = past_seasons.values.reshape(len(indexes), len(columns))
        self.seasons_df = pd.DataFrame(timeseries_reshaped, index=indexes, 
                                  columns=columns)

        # forecast case
        if parent.parameters.forecast_length > 0:
            self.forecast_values = self.current_season[-parent.parameters.forecast_length:]
            self.forecast_cumsum = self.forecast_values.cumsum()
            self.current_season = self.current_season[:-parent.parameters.forecast_length]
        else:
            self.forecast_values = pd.Series([np.nan])
            self.forecast_cumsum = pd.Series([np.nan])
            self.current_season_with_forecast = pd.Series([np.nan])
        
        # get selected seasons
        self.similar_seasons = get_similar_years(self.current_season.to_numpy(), 
                                            self.seasons_df, 
                                            parent.parameters.use_pearson)
        if isinstance(parent.properties.selected_years, str):
            selected_years = self.similar_seasons[:int(parent.properties.selected_years)]
        if isinstance(parent.properties.selected_years, list):
            selected_years = parent.properties.selected_years
        
        # build sub-dataframes
        self.seasonal_climatology = self.seasons_df.loc[parent.properties.climatology_year_ids]
        self.seasonal_monitoring = self.seasons_df.iloc[:, parent.properties.season_start_index:parent.properties.season_end_index]
        self.seasonal_mon_sel = self.seasonal_monitoring.loc[selected_years]
        self.seasonal_mon_clim = self.seasonal_monitoring.loc[parent.properties.climatology_year_ids]
        
        # calculate derived dataframes
        current_season_monitoring = self.current_season[parent.properties.season_start_index:parent.properties.current_season_trim_index]
        current_season_monitoring_with_forecast = self.current_season[parent.properties.season_start_index:parent.properties.current_season_trim_index_with_forecast]
        self.current_cumsum_mon = current_season_monitoring.cumsum()
        self.current_index = len(current_season_monitoring) - 1

        self.seasonal_cumsum = self.seasonal_monitoring.cumsum(axis=1)
        self.seasonal_sums = self.seasonal_cumsum.iloc[:, -1].rename(self.id)
        self.seasonal_current_totals = self.seasonal_cumsum.iloc[:, self.current_index].rename(self.id)
        self.seasonal_ensemble = get_ensemble(current_season_monitoring, 
                                              self.seasonal_monitoring)
        self.selected_seasons_cumsum = self.seasonal_mon_sel.cumsum(axis=1)
        self.selected_seasons_ensemble = get_ensemble(current_season_monitoring, 
                                                      self.seasonal_mon_sel)
        
        self.clim_seasons_cumsum = self.seasonal_mon_clim.cumsum(axis=1)
        self.clim_seasons_ensemble = get_ensemble(current_season_monitoring, 
                                                  self.seasonal_mon_clim)
        
        # calculate stats
        self.clim_seasons_totals = self.clim_seasons_cumsum.iloc[:, -1].to_numpy()
        self.clim_seasons_pctls = percentiles_to_values(self.clim_seasons_totals, [33, 67])
        self.seasonal_pctls = percentiles_to_values(self.seasonal_current_totals.to_numpy(), 
                                                             (3, 6, 11, 21, 33, 67))
        climatology_avg = self.seasonal_climatology.mean()

        # SOS detection
        if parent.parameters.rainy_season_detection_enabled:
            clim_avg_monitoring = climatology_avg[parent.properties.season_start_index:parent.properties.season_end_index]
            sos_data = get_start_of_season(current_season_monitoring, clim_avg_monitoring, self.seasonal_mon_clim,
                                                            parent.parameters,
                                                            parent.properties)
        else:
            sos_data = {
            'Start of Season Raw': None,
            'Start of Season': None,
            'Start of Season of Avg. Raw': None,
            'Start of Season of Avg.': None,
            'Start of Season Anomaly Raw': None,
            'Start of Season Anomaly': None,
    }
        # Stats for climatology seasons
        clim_ensemble_sums = self.clim_seasons_ensemble.iloc[:, -1].to_numpy()

        clim_avg = self.clim_seasons_cumsum.mean() # average aka. LTA (long term average)
        clim_med = self.clim_seasons_cumsum.median()
        clim_ensemble_med = self.clim_seasons_ensemble.median()
        clim_ensemble_avg = self.clim_seasons_ensemble.mean()
        clim_ensemble_percentiles = percentiles_to_values(clim_ensemble_sums, [33, 67])
        clim_ensemble_percentile_probabilities = [
            np.count_nonzero(clim_ensemble_sums < self.clim_seasons_pctls[0]) / len(clim_ensemble_sums),
            np.count_nonzero((clim_ensemble_sums >= self.clim_seasons_pctls[0]) & 
                             (clim_ensemble_sums < self.clim_seasons_pctls[1])) / len(clim_ensemble_sums),
            np.count_nonzero(clim_ensemble_sums >= self.clim_seasons_pctls[1]) / len(clim_ensemble_sums),
        ]
        clim_std = self.clim_seasons_cumsum.std()

        clim_avg_upto_current = clim_avg[self.current_index]
        if not np.isnan(self.forecast_values.iloc[-1]):
            clim_avg_upto_forecast = clim_avg[self.current_index + len(self.forecast_values)]
        else:
            clim_avg_upto_forecast = np.nan

        self.seasonal_long_term_stats = pd.DataFrame.from_dict({
            'LTA': clim_avg,
            'Median': clim_med,
            'Ensemble Med.': clim_ensemble_med,
            'E. LTA': clim_ensemble_avg,
        }, orient='index')
        self.seasonal_general_stats = pd.Series({
            'LTA': clim_avg[-1],
            'E. LTA': clim_ensemble_avg[-1],
            'Median': clim_med[-1],
            'Ensemble Med.': clim_ensemble_med[-1],
            'LTA up to Current Season': clim_avg_upto_current,
            'Total up to Current Season/LTA Pct.': (self.current_cumsum_mon[-1]/clim_avg_upto_current)*100,
            'Total up to Forecast/LTA Pct.': ((self.current_cumsum_mon[-1]+self.forecast_cumsum.iloc[-1])/clim_avg_upto_forecast)*100,
            'Ensemble Med./LTA Pct.': (clim_ensemble_med[-1]/clim_avg[-1])*100,
            'Ensemble Med. Pctl.': percentiles_from_values(self.seasonal_sums, [clim_ensemble_med[-1]])[0],
            'St. Dev.': clim_std[-1],
            'Ensemble 33 Pctl.': clim_ensemble_percentiles[0],
            'Ensemble 67 Pctl.': clim_ensemble_percentiles[1],
            'E. Prob. Below Normal Pct.': clim_ensemble_percentile_probabilities[0]*100,
            'E. Prob. of Normal Pct.': clim_ensemble_percentile_probabilities[1]*100,
            'E. Prob. Above Normal Pct.': clim_ensemble_percentile_probabilities[2]*100,
        }, 
        name=self.id)

        # Stats for selected seasons        
        selected_ensemble_sums = self.selected_seasons_ensemble.iloc[:, -1].to_numpy()

        selected_avg = self.selected_seasons_cumsum.mean()
        selected_med = self.selected_seasons_cumsum.median()
        selected_ensemble_med = self.selected_seasons_ensemble.median()
        selected_ensemble_avg = self.selected_seasons_ensemble.mean()
        selected_ensemble_percentiles = percentiles_to_values(selected_ensemble_sums, [33, 67])
        selected_ensemble_percentile_probabilities = [
            np.count_nonzero(selected_ensemble_sums < self.clim_seasons_pctls[0]) / len(selected_ensemble_sums),
            np.count_nonzero((selected_ensemble_sums >= self.clim_seasons_pctls[0]) & 
                             (selected_ensemble_sums < self.clim_seasons_pctls[1])) / len(selected_ensemble_sums),
            np.count_nonzero(selected_ensemble_sums >= self.clim_seasons_pctls[1]) / len(selected_ensemble_sums),
        ]
        selected_std = self.selected_seasons_cumsum.std()

        selected_avg_upto_current = selected_avg[self.current_index]
        if not np.isnan(self.forecast_values.iloc[-1]):
            selected_avg_upto_forecast = selected_avg[self.current_index + len(self.forecast_values)]
        else:
            selected_avg_upto_forecast = np.nan

        # calculate the stats
        self.selected_seasons_long_term_stats = pd.DataFrame.from_dict({
            'LTA': selected_avg,
            'Median': selected_med,
            'Ensemble Med.': selected_ensemble_med,
            'E. LTA': selected_ensemble_avg,
        }, orient='index')
        self.selected_seasons_general_stats = pd.Series({
            'LTA': selected_avg[-1],
            'E. LTA': selected_ensemble_avg[-1],
            'Median': selected_med[-1],
            'Ensemble Med.': selected_ensemble_med[-1],
            'LTA up to Current Season': selected_avg_upto_current,
            'Total up to Current Season/LTA Pct.': (self.current_cumsum_mon[-1]/selected_avg_upto_current)*100,
            'Total up to Forecast/LTA Pct.': ((self.current_cumsum_mon[-1]+self.forecast_cumsum.iloc[-1])/selected_avg_upto_forecast)*100,
            'Ensemble Med./LTA Pct.': (selected_ensemble_med[-1]/selected_avg[-1])*100,
            'Ensemble Med. Pctl.': percentiles_from_values(self.seasonal_sums, [selected_ensemble_med[-1]])[0],
            'St. Dev.': selected_std[-1],
            'Ensemble 33 Pctl.': selected_ensemble_percentiles[0],
            'Ensemble 67 Pctl.': selected_ensemble_percentiles[1],
            'E. Prob. Below Normal Pct.': selected_ensemble_percentile_probabilities[0]*100,
            'E. Prob. of Normal Pct.': selected_ensemble_percentile_probabilities[1]*100,
            'E. Prob. Above Normal Pct.': selected_ensemble_percentile_probabilities[2]*100,
        }, 
        name=self.id)
        
        place_lt_stats = {
            'Climatology Average': climatology_avg,
            'Current Season': self.current_season,
            'Current Season Accumulation': self.current_cumsum_mon,
            'Forecast': self.forecast_values,
            'Forecast Accumulation': self.current_cumsum_mon[-1] + self.forecast_cumsum,
        }
        self.place_long_term_stats = pd.DataFrame([pd.Series(v, name=k) for k, v in place_lt_stats.items()])

        self.place_general_stats = pd.Series({
            'Current Season Pctl.': percentiles_from_values(self.seasonal_current_totals.to_numpy(), 
                [self.current_cumsum_mon[-1]])[0],
            'Current Accumulation to Present': self.current_cumsum_mon[-1],
            'Current Accumulation to Forecast': self.current_cumsum_mon[-1] + self.forecast_cumsum.iloc[-1],
            'Seasonal 3 Pctl.': self.seasonal_pctls[0],
            'Seasonal 6 Pctl.': self.seasonal_pctls[1],
            'Seasonal 11 Pctl.': self.seasonal_pctls[2],
            'Seasonal 21 Pctl.': self.seasonal_pctls[3],
            'Seasonal 33 Pctl.': self.seasonal_pctls[4],
            'Seasonal 67 Pctl.': self.seasonal_pctls[5],
            'Climatology Average at Current Dekad': self.clim_seasons_cumsum.mean()[self.current_index],
            'Climatology 33 Pctl.': self.clim_seasons_pctls[0],
            'Climatology 67 Pctl.': self.clim_seasons_pctls[1],
            **sos_data,
        }, 
        name=self.id
        )
