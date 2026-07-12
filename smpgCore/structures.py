import numpy as np
import pandas as pd


from qgis.core import (
    QgsVectorLayer,
)

from .utils import *
from .pyqgis_utils import get_polygon_field_data

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
    def __init__(self, name: str, dataset: pd.DataFrame, col_names: list[str], parameters: Parameters, vector_layer: QgsVectorLayer) -> None:
        """Constructor

        Args:
            name (str): name of the dataset.
            dataset (DataFrame): data contained in the dataset.
            col_names (list[str]): column names from the dataset.
            parameters (Parameters): computation parameters.
        """
        self.name = name
        self.timestamps = col_names
        
        # Filter dataset rows to the ones existing in the vector layer
        if vector_layer is not None:
            polygon_selected_data = get_polygon_field_data(vector_layer, parameters.target_id_field)
            filtered_dataset = dataset[dataset.index.isin(polygon_selected_data.values())]
            self.dataset = filtered_dataset
        else: 
            self.dataset = dataset
        
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
        self.properties.place_ids = self.dataset.index.astype(str).tolist()
        self.properties.season_start_index = default_sub_seasons.index(self.parameters.season_start)
        self.properties.season_end_index = default_sub_seasons.index(self.parameters.season_end)+1
        self.properties.current_season_trim_index_with_forecast = min(self.properties.current_season_length, self.properties.season_end_index)
        self.properties.current_season_trim_index = self.properties.current_season_trim_index_with_forecast - parameters.forecast_length

        # create a dictionary with the places
        self.places: dict[str, Place] = {}
        for place, timeseries in self.dataset.iterrows():
            # print(place)
            self.places[place] = Place(place, timeseries, self)
    
class Place:
    """Represents a place with associated time series data.

    All stats are calculated here.
    """
        
    def __init__(self, place_id: str, timeseries: pd.Series, parent: Dataset) -> None:
        self.id = place_id # Unique identifier of the polygon
        indexes = parent.properties.year_ids
        columns = parent.properties.sub_season_ids

        # split timeseries into years
        current_season = timeseries[parent.climatology_end_index : ]
        current_season.index = columns[:len(current_season)]
        past_seasons = timeseries[parent.season_shift : parent.climatology_end_index]
        timeseries_reshaped = past_seasons.values.reshape(len(indexes), len(columns))
        seasons_df = pd.DataFrame(timeseries_reshaped, index=indexes, 
                                  columns=columns)

        # forecast case
        if parent.parameters.forecast_length > 0:
            forecast_values = current_season[-parent.parameters.forecast_length:]
            forecast_cumsum = forecast_values.cumsum()
            current_season_with_forecast = current_season.copy()
            current_season = current_season[:-parent.parameters.forecast_length]
        else:
            forecast_values = pd.Series([np.nan])
            forecast_cumsum = pd.Series([np.nan])
            current_season_with_forecast = current_season.copy()
        
        # get selected seasons
        self.similar_seasons = get_similar_years(current_season.to_numpy(), 
                                            seasons_df, 
                                            parent.parameters.use_pearson)
        if isinstance(parent.properties.selected_years, str):
            selected_years = self.similar_seasons[:int(parent.properties.selected_years)]
        if isinstance(parent.properties.selected_years, list):
            selected_years = parent.properties.selected_years
        
        # build sub-dataframes
        seasons_climatology = seasons_df.loc[parent.properties.climatology_year_ids]
        seasonal_monitoring = seasons_df.iloc[:, parent.properties.season_start_index:parent.properties.season_end_index]
        seasonal_mon_sel = seasonal_monitoring.loc[selected_years]
        seasonal_mon_clim = seasonal_monitoring.loc[parent.properties.climatology_year_ids]
        
        # calculate derived dataframes
        current_season_monitoring = current_season[parent.properties.season_start_index:parent.properties.current_season_trim_index]
        current_season_monitoring_with_forecast = current_season_with_forecast[parent.properties.season_start_index:parent.properties.current_season_trim_index_with_forecast]
        current_cumsum_mon = current_season_monitoring.cumsum()
        current_cumsum_mon_with_forecast = current_season_monitoring_with_forecast.cumsum()
        current_index = len(current_season_monitoring) - 1

        self.seasonal_cumsum = seasonal_monitoring.cumsum(axis=1)
        seasonal_sums = self.seasonal_cumsum.iloc[:, -1].rename(self.id)
        self.seasonal_sums_upto_current = self.seasonal_cumsum.iloc[:, current_index].rename(self.id)
        self.seasons_ensemble = get_ensemble(current_season_monitoring, 
                                              seasonal_monitoring)
        
        self.selected_seasons_cumsum = seasonal_mon_sel.cumsum(axis=1)
        self.selected_seasons_ensemble = get_ensemble(current_season_monitoring, 
                                                      seasonal_mon_sel)
        self.selected_seasons_ensemble_with_forecast = get_ensemble(current_season_monitoring_with_forecast, 
                                                      seasonal_mon_sel)
        
        clim_seasons_cumsum = seasonal_mon_clim.cumsum(axis=1)
        clim_seasons_ensemble = get_ensemble(current_season_monitoring, 
                                                  seasonal_mon_clim)
        clim_seasons_ensemble_with_forecast = get_ensemble(current_season_monitoring_with_forecast, 
                                                  seasonal_mon_clim)
        
        # calculate stats
        clim_seasons_totals = clim_seasons_cumsum.iloc[:, -1].to_numpy()
        clim_seasons_pctls = percentiles_to_values(clim_seasons_totals, [33, 67])
        seasonal_pctls = percentiles_to_values(self.seasonal_sums_upto_current.to_numpy(), 
                                                             (3, 6, 11, 21, 33, 67))
        climatology_avg = seasons_climatology.mean()

        # SOS detection
        if parent.parameters.rainy_season_detection_enabled:
            clim_avg_monitoring = climatology_avg[parent.properties.season_start_index:parent.properties.season_end_index]
            sos_data = get_start_of_season(current_season_monitoring, clim_avg_monitoring, seasonal_mon_clim,
                                                            parent.parameters,
                                                            parent.properties)
            forecast_sos_data = get_start_of_season(current_season_monitoring_with_forecast, clim_avg_monitoring, seasonal_mon_clim,
                                                            parent.parameters,
                                                            parent.properties)
            forecast_sos_data = {f'Forecast {key}': value for key, value in forecast_sos_data.items()} # Add the prefix "Forecast" to each key
            sos_data = {**forecast_sos_data, **sos_data}
        else:
            sos_data = {
                'Start of Season Raw': None,
                'Start of Season': None,
                'Start of Season of Avg. Raw': None,
                'Start of Season of Avg.': None,
                'Start of Season Anomaly Raw': None,
                'Start of Season Anomaly': None,
            }
            forecast_sos_data = {f'Forecast {key}': value for key, value in sos_data.items()}
            sos_data = {**forecast_sos_data, **sos_data}
            
        # Stats for climatology seasons
        clim_ensemble_sums = clim_seasons_ensemble.iloc[:, -1].to_numpy()
        clim_ensemble_sums_with_forecast = clim_seasons_ensemble_with_forecast.iloc[:, -1].to_numpy()

        clim_avg = clim_seasons_cumsum.mean() # cumulative average aka. LTA (long term average)
        clim_med = clim_seasons_cumsum.median()
        clim_ensemble_med = clim_seasons_ensemble.median()
        clim_ensemble_med_with_forecast = clim_seasons_ensemble_with_forecast.median()
        # clim_ensemble_avg = clim_seasons_ensemble.mean()
        # clim_ensemble_percentiles = percentiles_to_values(clim_ensemble_sums, [33, 67])
        clim_ensemble_percentile_probabilities = [
            np.count_nonzero(clim_ensemble_sums < clim_seasons_pctls[0]) / len(clim_ensemble_sums),
            np.count_nonzero((clim_ensemble_sums >= clim_seasons_pctls[0]) & 
                             (clim_ensemble_sums < clim_seasons_pctls[1])) / len(clim_ensemble_sums),
            np.count_nonzero(clim_ensemble_sums >= clim_seasons_pctls[1]) / len(clim_ensemble_sums),
        ]
        clim_ensemble_percentile_probabilities_with_forecast = [
            np.count_nonzero(clim_ensemble_sums_with_forecast < clim_seasons_pctls[0]) / len(clim_ensemble_sums_with_forecast),
            np.count_nonzero((clim_ensemble_sums_with_forecast >= clim_seasons_pctls[0]) & 
                             (clim_ensemble_sums_with_forecast < clim_seasons_pctls[1])) / len(clim_ensemble_sums_with_forecast),
            np.count_nonzero(clim_ensemble_sums_with_forecast >= clim_seasons_pctls[1]) / len(clim_ensemble_sums_with_forecast),
        ]
        clim_std = clim_seasons_cumsum.std()

        clim_avg_upto_current = clim_avg.iloc[current_index]
        if not np.isnan(forecast_values.iloc[-1]):
            clim_avg_upto_forecast = clim_avg.iloc[current_index + len(forecast_values)]
        else:
            clim_avg_upto_forecast = np.nan

        self.seasonal_long_term_stats = pd.DataFrame.from_dict({
            'LTA': clim_avg,
            'Median': clim_med,
            # 'Ensemble Med.': clim_ensemble_med,
            # 'E. LTA': clim_ensemble_avg,
        }, orient='index')
        self.seasonal_general_stats = pd.Series({
            'LTA': clim_avg.iloc[-1],
            # 'E. LTA': clim_ensemble_avg[-1],
            # 'Median': clim_med[-1],
            'Ensemble Med.': clim_ensemble_med.iloc[-1],
            'Ensemble Med. w/ Forecast': clim_ensemble_med_with_forecast.iloc[-1],
            'LTA up to Current Season': clim_avg_upto_current,
            'Total up to Current Season/LTA Pct.': (current_cumsum_mon.iloc[-1]/clim_avg_upto_current)*100,
            'Total up to Forecast/LTA Pct.': ((current_cumsum_mon.iloc[-1]+forecast_cumsum.iloc[-1])/clim_avg_upto_forecast)*100,
            'Ensemble Med./LTA Pct.': (clim_ensemble_med.iloc[-1]/clim_avg.iloc[-1])*100,
            'Ensemble Med. w Forecast/LTA Pct.': (clim_ensemble_med_with_forecast.iloc[-1]/clim_avg.iloc[-1])*100,
            'Ensemble Med. Pctl.': percentiles_from_values(seasonal_sums, [clim_ensemble_med.iloc[-1]])[0],
            'Ensemble Med. Pctl. w/ Forecast': percentiles_from_values(seasonal_sums, [clim_ensemble_med_with_forecast.iloc[-1]])[0],
            'St. Dev.': clim_std.iloc[-1],
            # 'Ensemble 33 Pctl.': clim_ensemble_percentiles[0],
            # 'Ensemble 67 Pctl.': clim_ensemble_percentiles[1],
            'Probability Below Normal': clim_ensemble_percentile_probabilities[0]*100,
            'Probability of Normal': clim_ensemble_percentile_probabilities[1]*100,
            'Probability Above Normal': clim_ensemble_percentile_probabilities[2]*100,
            'Probability Below Normal w/ Forecast': clim_ensemble_percentile_probabilities_with_forecast[0]*100,
            'Probability of Normal w/ Forecast': clim_ensemble_percentile_probabilities_with_forecast[1]*100,
            'Probability Above Normal w/ Forecast': clim_ensemble_percentile_probabilities_with_forecast[2]*100,
        }, 
        name=self.id)

        # Stats for selected seasons        
        selected_ensemble_sums = self.selected_seasons_ensemble.iloc[:, -1].to_numpy()
        selected_ensemble_sums_with_forecast = self.selected_seasons_ensemble_with_forecast.iloc[:, -1].to_numpy()

        selected_avg = self.selected_seasons_cumsum.mean()
        # selected_med = self.selected_seasons_cumsum.median()
        selected_ensemble_med = self.selected_seasons_ensemble.median()
        selected_ensemble_med_with_forecast = self.selected_seasons_ensemble_with_forecast.median()
        selected_ensemble_avg = self.selected_seasons_ensemble.mean()
        selected_ensemble_avg_with_forecast = self.selected_seasons_ensemble_with_forecast.mean()
        selected_ensemble_percentiles = percentiles_to_values(selected_ensemble_sums, [33, 67])
        selected_ensemble_percentiles_with_forecast = percentiles_to_values(selected_ensemble_sums_with_forecast, [33, 67])
        selected_ensemble_percentile_probabilities = [
            np.count_nonzero(selected_ensemble_sums < clim_seasons_pctls[0]) / len(selected_ensemble_sums),
            np.count_nonzero((selected_ensemble_sums >= clim_seasons_pctls[0]) & 
                             (selected_ensemble_sums < clim_seasons_pctls[1])) / len(selected_ensemble_sums),
            np.count_nonzero(selected_ensemble_sums >= clim_seasons_pctls[1]) / len(selected_ensemble_sums),
        ]
        selected_ensemble_percentile_probabilities_with_forecast = [
            np.count_nonzero(selected_ensemble_sums_with_forecast < clim_seasons_pctls[0]) / len(selected_ensemble_sums_with_forecast),
            np.count_nonzero((selected_ensemble_sums_with_forecast >= clim_seasons_pctls[0]) & 
                             (selected_ensemble_sums_with_forecast < clim_seasons_pctls[1])) / len(selected_ensemble_sums_with_forecast),
            np.count_nonzero(selected_ensemble_sums_with_forecast >= clim_seasons_pctls[1]) / len(selected_ensemble_sums_with_forecast),
        ]
        selected_std = self.selected_seasons_cumsum.std()

        selected_avg_upto_current = selected_avg.iloc[current_index]
        if not np.isnan(forecast_values.iloc[-1]):
            selected_avg_upto_forecast = selected_avg.iloc[current_index + len(forecast_values)]
        else:
            selected_avg_upto_forecast = np.nan

        # calculate the stats
        self.selected_seasons_long_term_stats = pd.DataFrame.from_dict({
            # 'LTA': selected_avg,
            # 'Median': selected_med,
            'Ensemble Med.': selected_ensemble_med,
            'Ensemble Med. w/ Forecast': selected_ensemble_med_with_forecast,
            'E. LTA': selected_ensemble_avg,
        }, orient='index')
        self.selected_seasons_general_stats = pd.Series({
            'LTA': selected_avg.iloc[-1],
            'E. LTA': selected_ensemble_avg.iloc[-1],
            'E. LTA w/ Forecast': selected_ensemble_avg_with_forecast.iloc[-1],
            # 'Median': selected_med[-1],
            'Ensemble Med.': selected_ensemble_med.iloc[-1],
            'Ensemble Med. w/ Forecast': selected_ensemble_med_with_forecast.iloc[-1],
            'LTA up to Current Season': selected_avg_upto_current,
            'Total up to Current Season/LTA Pct.': (current_cumsum_mon.iloc[-1]/selected_avg_upto_current)*100,
            # 'Total up to Forecast/LTA Pct.': ((current_cumsum_mon.iloc[-1]+forecast_cumsum.iloc[-1])/selected_avg_upto_forecast)*100,
            'Ensemble Med./LTA Pct.': (selected_ensemble_med.iloc[-1]/selected_avg.iloc[-1])*100,
            'Ensemble Med. w Forecast/LTA Pct.': (selected_ensemble_med_with_forecast.iloc[-1]/selected_avg.iloc[-1])*100,
            'Ensemble Med. Pctl.': percentiles_from_values(seasonal_sums, [selected_ensemble_med.iloc[-1]])[0],
            'Ensemble Med. Pctl. w/ Forecast': percentiles_from_values(seasonal_sums, [selected_ensemble_med_with_forecast.iloc[-1]])[0],
            'St. Dev.': selected_std.iloc[-1],
            'Ensemble 33 Pctl.': selected_ensemble_percentiles[0],
            'Ensemble 67 Pctl.': selected_ensemble_percentiles[1],
            'Ensemble 33 Pctl. w/ Forecast': selected_ensemble_percentiles_with_forecast[0],
            'Ensemble 67 Pctl. w/ Forecast': selected_ensemble_percentiles_with_forecast[1],
            'Probability Below Normal': selected_ensemble_percentile_probabilities[0]*100,
            'Probability of Normal': selected_ensemble_percentile_probabilities[1]*100,
            'Probability Above Normal': selected_ensemble_percentile_probabilities[2]*100,
            'Probability Below Normal w/ Forecast': selected_ensemble_percentile_probabilities_with_forecast[0]*100,
            'Probability of Normal w/ Forecast': selected_ensemble_percentile_probabilities_with_forecast[1]*100,
            'Probability Above Normal w/ Forecast': selected_ensemble_percentile_probabilities_with_forecast[2]*100,
        }, 
        name=self.id)
        
        place_lt_stats = {
            'Climatology Average': climatology_avg,
            'Current Season': current_season,
            'Current Season Accumulation': current_cumsum_mon,
            'Current Season Accumulation with Forecast': current_cumsum_mon_with_forecast,
            'Forecast': forecast_values,
            'Forecast Accumulation': current_cumsum_mon.iloc[-1] + forecast_cumsum,
        }
        self.place_long_term_stats = pd.DataFrame([pd.Series(v, name=k) for k, v in place_lt_stats.items()])

        self.place_general_stats = pd.Series({
            'Current Season Pctl.': percentiles_from_values(self.seasonal_sums_upto_current.to_numpy(), 
                [current_cumsum_mon.iloc[-1]])[0],
            'Current Accumulation to Present': current_cumsum_mon.iloc[-1],
            'Current Accumulation to Forecast': current_cumsum_mon.iloc[-1] + forecast_cumsum.iloc[-1],
            'Seasonal 3 Pctl.': seasonal_pctls[0],
            'Seasonal 6 Pctl.': seasonal_pctls[1],
            'Seasonal 11 Pctl.': seasonal_pctls[2],
            'Seasonal 21 Pctl.': seasonal_pctls[3],
            'Seasonal 33 Pctl.': seasonal_pctls[4],
            'Seasonal 67 Pctl.': seasonal_pctls[5],
            'Climatology Average at Current Dekad': clim_seasons_cumsum.mean().iloc[current_index],
            'Climatology 33 Pctl.': clim_seasons_pctls[0],
            'Climatology 67 Pctl.': clim_seasons_pctls[1],
            **sos_data,
        }, 
        name=self.id
        )
