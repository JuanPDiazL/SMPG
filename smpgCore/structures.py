from math import isnan
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
        self.season_start_index = default_sub_seasons.index(self.parameters.season_start)
        self.season_end_index = default_sub_seasons.index(self.parameters.season_end)+1
        self.current_season_trim_index = min(self.properties.current_season_length, self.season_end_index) - parameters.is_forecast

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
        self.forecast_value = np.NaN
        if parent.parameters.is_forecast: 
            self.forecast_value = self.current_season[-1]
            self.current_season = self.current_season[:-1]
        
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
        self.seasonal_monitoring = self.seasons_df.iloc[:, parent.season_start_index:parent.season_end_index]
        self.seasonal_mon_sel = self.seasonal_monitoring.loc[selected_years]
        self.seasonal_mon_clim = self.seasonal_monitoring.loc[parent.properties.climatology_year_ids]
        
        # calculate derived dataframes
        current_season_monitoring = self.current_season[parent.season_start_index:parent.current_season_trim_index]
        self.current_cumsum = self.current_season.cumsum()
        self.current_cumsum_mon = current_season_monitoring.cumsum()
        self.current_index = len(current_season_monitoring) - 1

        self.seasonal_cumsum = self.seasonal_monitoring.cumsum(axis=1)
        self.seasonal_totals = self.seasonal_cumsum.iloc[:, -1].rename(self.id)
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
        if parent.parameters.rainy_season_detection["sos"]["enabled"]:
            avg_monitoring = climatology_avg[parent.season_start_index:parent.season_end_index]
            avg_monitoring_cumsum = avg_monitoring.cumsum() #! possible duplicated calculation
            current_sos, clim_avg_sos = get_start_of_season(current_season_monitoring, avg_monitoring,
                                                            parent.parameters.rainy_season_detection["sos"])
            sos_index_current, started_current, sos_class_current = current_sos
            sos_index_avg, started_avg, sos_class_avg = clim_avg_sos
            sos_index_avg += parent.season_start_index
            sos_index_current += parent.season_start_index
            if sos_class_avg == 'Started':
                sos_class_avg = columns[sos_index_avg]
            elif sos_class_avg == 'Possible Start':
                sos_class_avg = f'Possible Start at {columns[sos_index_avg]}'
            if sos_class_current == 'Started':
                sos_class_current = columns[sos_index_current]
            elif sos_class_current == 'Possible Start':
                sos_class_current = f'Possible Start at {columns[sos_index_current]}'

            sos_anomaly = sos_index_current - sos_index_avg
            if not started_current:
                sos_anomaly_class = 'Yet to Start'
            elif not started_avg:
                sos_anomaly_class = 'No Reference'
            else:
                sos_anomaly_class = str(sos_anomaly)
                sos_anomaly_class = f'{abs(sos_anomaly)} {parent.properties.period_unit_id}s {"Late" if sos_anomaly > 0 else "Early"}'
        else:
            # nullify sos values
            sos_index_current, sos_class_current, sos_index_avg, sos_class_avg, sos_anomaly, sos_anomaly_class = [None] * 6

        # Generate required Series and Dataframes, these are the final results
        self.seasonal_general_stats, self.seasonal_long_term_stats = \
            self.get_place_stats(self.clim_seasons_cumsum, self.clim_seasons_ensemble)
        self.selected_seasons_general_stats, self.selected_seasons_long_term_stats = \
            self.get_place_stats(self.selected_seasons_cumsum, self.selected_seasons_ensemble)
        
        place_lt_stats = {
            'Climatology Average': climatology_avg,
            'Current Season': self.current_season,
            'Current Season Accumulation': self.current_cumsum_mon,
        }
        self.place_long_term_stats = pd.DataFrame([pd.Series(v, name=k) for k, v in place_lt_stats.items()])

        self.place_general_stats = pd.Series({
            'Current Season Pctl.': percentiles_from_values(self.seasonal_current_totals.to_numpy(), 
                [self.current_cumsum_mon[-1]])[0],
            'Current Season Total': self.current_cumsum_mon[-1],
            'Seasonal 3 Pctl.': self.seasonal_pctls[0],
            'Seasonal 6 Pctl.': self.seasonal_pctls[1],
            'Seasonal 11 Pctl.': self.seasonal_pctls[2],
            'Seasonal 21 Pctl.': self.seasonal_pctls[3],
            'Seasonal 33 Pctl.': self.seasonal_pctls[4],
            'Seasonal 67 Pctl.': self.seasonal_pctls[5],
            'Climatology Average at Current Dekad': self.clim_seasons_cumsum.mean()[self.current_index],
            'Climatology 33 Pctl.': self.clim_seasons_pctls[0],
            'Climatology 67 Pctl.': self.clim_seasons_pctls[1],
            'Forecast': self.forecast_value,
            'Current Season+Forecast': self.current_cumsum_mon[-1] + self.forecast_value,
            'Start of Season': sos_index_current,
            'Start of Season Class': sos_class_current,
            'Start of Season of Avg.': sos_index_avg,
            'Start of Season of Avg. Class': sos_class_avg,
            'Start of Season Anomaly': sos_anomaly,
            'Start of Season Anomaly Class': sos_anomaly_class,
        }, 
        name=self.id
        )

    def get_place_stats(self, seasonal_cumsum: pd.DataFrame, seasonal_ensemble: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
        """Calculates and returns the place statistics for the seasons.

        It calculates various statistics, including long-term averages (LTA), 
        medians, standard deviations, and percentile probabilities. 
        
        Parameters:
            seasonal_cumsum (pd.DataFrame): Cumulative sums of seasonal data
            seasonal_ensemble (pd.DataFrame): Ensemble values for each season

        Returns:
            Tuple[pd.Series, pd.DataFrame]: A tuple containing the place general stats and long term stats
        """
        # calculate auxiliary variables
        seasonal_totals = seasonal_cumsum.iloc[:, -1].to_numpy()
        ensemble_totals = seasonal_ensemble.iloc[:, -1].to_numpy()

        seasonal_lta = seasonal_cumsum.mean()
        seasonal_ltm = seasonal_cumsum.median()
        ensemble_median = seasonal_ensemble.median()
        ensemble_lta = seasonal_ensemble.mean()
        ensemble_pctls = percentiles_to_values(ensemble_totals, [33, 67])
        ensemble_pctl_probabilities = [
            np.count_nonzero(ensemble_totals < self.clim_seasons_pctls[0]) / len(ensemble_totals),
            np.count_nonzero((ensemble_totals >= self.clim_seasons_pctls[0]) & 
                             (ensemble_totals < self.clim_seasons_pctls[1])) / len(ensemble_totals),
            np.count_nonzero(ensemble_totals >= self.clim_seasons_pctls[1]) / len(ensemble_totals),
        ]
        standard_dev = seasonal_cumsum.std()

        lta_upto_current_season = seasonal_lta[self.current_index]
        if not np.isnan(self.forecast_value):
            lta_upto_forecast = seasonal_lta[self.current_index + 1]
        else:
            lta_upto_forecast = np.NaN

        # calculate the stats
        seasonal_long_term_stats = pd.DataFrame.from_dict({
            'LTA': seasonal_lta,
            'Median': seasonal_ltm,
            'Ensemble Med.': ensemble_median,
            'E. LTA': ensemble_lta,
        }, orient='index')
        seasonal_general_stats = pd.Series({
            'LTA': seasonal_lta[-1],
            'E. LTA': ensemble_lta[-1],
            'Median': seasonal_ltm[-1],
            'Ensemble Med.': ensemble_median[-1],
            'LTA up to Current Season': lta_upto_current_season,
            'C. Dk./LTA Pct.': (self.current_cumsum_mon[-1]/lta_upto_current_season)*100,
            'C. Dk.+Forecast/LTA Pct.': ((self.current_cumsum_mon[-1]+self.forecast_value)/lta_upto_forecast)*100,
            'Ensemble Med./LTA Pct.': (ensemble_median[-1]/seasonal_lta[-1])*100,
            'Ensemble Med. Pctl.': percentiles_from_values(self.seasonal_totals, [ensemble_median[-1]])[0],
            'St. Dev.': standard_dev[-1],
            'Ensemble 33 Pctl.': ensemble_pctls[0],
            'Ensemble 67 Pctl.': ensemble_pctls[1],
            'E. Prob. Below Normal Pct.': ensemble_pctl_probabilities[0]*100,
            'E. Prob. of Normal Pct.': ensemble_pctl_probabilities[1]*100,
            'E. Prob. Above Normal Pct.': ensemble_pctl_probabilities[2]*100,
        }, 
        name=self.id)
        return seasonal_general_stats, seasonal_long_term_stats