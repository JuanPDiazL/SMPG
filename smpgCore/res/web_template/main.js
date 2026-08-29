// This file contains the main logic that initializes the page

"use strict";

// Globals
var previousSelectionElement = null;
var resizeTimeout = false; // holder for timeout
var resizeDelay = 300; // debounce delay
var contentHeight = null;
var editingLayout = false;

// Decompress and parse data
var datasetProperties = JSON.parse(decompress(dataset_properties_json));
var parameters = JSON.parse(decompress(parameters_json));
var place_general_stats = csvParse(decompress(place_general_stats_csv));
var place_long_term_stats = parseRowsObjectCsv(decompress(place_long_term_stats_csv_obj));
var seasonal_current_totals = csvParseRows(decompress(seasonal_current_totals_csv));
var seasonal_forecast_totals = csvParseRows(decompress(seasonal_forecast_totals_csv));
var seasonal_general_stats = csvParse(decompress(seasonal_general_stats_csv));
var selected_seasons_general_stats = csvParse(decompress(selected_seasons_general_stats_csv));
var seasonal_cumsum = parseRowsObjectCsv(decompress(seasonal_cumsum_csv_obj));
var seasonal_ensemble = parseRowsObjectCsv(decompress(seasonal_ensemble_csv_obj));
var seasonal_long_term_stats  = parseRowsObjectCsv(decompress(seasonal_long_term_stats_csv_obj));
var selected_seasons_cumsum = parseRowsObjectCsv(decompress(selected_seasons_cumsum_csv_obj));
var selected_seasons_ensemble = parseRowsObjectCsv(decompress(selected_seasons_ensemble_csv_obj));
var selected_seasons_ensemble_with_forecast = parseRowsObjectCsv(decompress(selected_seasons_ensemble_with_forecast_csv_obj));
var selected_seasons_long_term_stats   = parseRowsObjectCsv(decompress(selected_seasons_long_term_stats_csv_obj));

// Global data properties
const period_unit = datasetProperties['period_unit_id'];
const monitoringOffset = datasetProperties['sub_season_offset'];
const firstPlaceKey = datasetProperties['place_ids'][0];
const monitoringLength = place_long_term_stats[firstPlaceKey]['Current Season Accumulation'].slice(monitoringOffset).indexOf(null) 
const currentMonitoringLength = place_long_term_stats[firstPlaceKey]['Current Season Accumulation'].slice(monitoringOffset).indexOf(null) 
const currentLength = place_long_term_stats[firstPlaceKey]['Current Season'].indexOf(null);
const hasForecast = parameters['forecast_length'];
const hasSos = parameters['rainy_season_detection_enabled'];

const hasMap = isDeclared("topojson_map") && topojson_map !== null;
const hasReferenceMap = isDeclared("reference_topojson_map") && reference_topojson_map !== null;

const mapFields = [
    'None', 'Current Period Pct. of Avg.',
    'Total up to Current Period Pct. of Avg.',
    'Ensemble Med. Pct. of Avg.', 'Probability Below Normal',
    'Probability of Normal', 'Probability Above Normal',
    'Ensemble Med. Pctl.', 'Current Season Pctl.',
    ...(hasForecast ? [
        'Forecast Pctl.', 'Total up to Forecast Pct. of Avg.',
        'Ensemble Med. w Forecast Pct. of Avg.', 'Ensemble Med. Pctl. w. Forecast',
        'Probability Below Normal w. Forecast', 'Probability of Normal w. Forecast',
        'Probability Above Normal w. Forecast',
    ] : []),
    ...(hasForecast ? ['Forecast 1st Period Pct. of Avg.'] : []),
    ...(hasForecast >= 2 ? ['Forecast Accumulation Pct. of Avg.'] : []),
    ...(hasForecast >= 3 ? ['Forecast 3rd Period Pct. of Avg.'] : []),
    ...(hasSos ? [
        'Start of Season', 'Start of Season Anomaly'] : []),
    ...(hasSos && hasForecast ? [
        'Forecast Start of Season', 'Forecast Start of Season Anomaly'] : []),
];

var currentDataIndex = firstPlaceKey;

// Initialize map data
if(hasMap) {
    var topoJsonObjectMap = JSON.parse(decompress(topojson_map));
    if (hasReferenceMap) {
        var referenceTopoJsonObjectMap = JSON.parse(decompress(reference_topojson_map));
    } else {
        var referenceTopoJsonObjectMap = topoJsonObjectMap;
    }

    var mapJson = topojson.feature(topoJsonObjectMap, topoJsonObjectMap.objects.map);
    var referenceMapJson = topojson.feature(referenceTopoJsonObjectMap, referenceTopoJsonObjectMap.objects.map);

    // Populate stat selects
    var property_ids = Object.keys(Object.values(mapJson["features"])[0]["properties"]);
    property_ids.splice(0, 0, "None"); // Add None element
    var idField = parameters["target_id_field"];
}

// Debug data logs
console.log('dataset_properties', datasetProperties);
console.log('parameters', parameters);
console.log('place_general_stats', place_general_stats);
console.log('place_long_term_stats', place_long_term_stats);
console.log('seasonal_current_totals', seasonal_current_totals);
console.log('seasonal_general_stats', seasonal_general_stats);
console.log('selected_seasons_general_stats', selected_seasons_general_stats);
console.log('seasonal_cumsum', seasonal_cumsum);
console.log('seasonal_ensemble', seasonal_ensemble);
console.log('seasonal_long_term_stats', seasonal_long_term_stats);
console.log('selected_seasons_cumsum', selected_seasons_cumsum);
console.log('selected_seasons_ensemble', selected_seasons_ensemble);
console.log('selected_seasons_ensemble_with_forecast', selected_seasons_ensemble_with_forecast);
console.log('selected_seasons_long_term_stats', selected_seasons_long_term_stats);

// HTML Elements
const BODY = document.body;
const HEADER = d3.select('#contentHeaderText');
const MODAL = document.getElementById('modal');
const MODAL_HEADER = document.getElementById('modalHeaderText');
const MODAL_TEXT = document.getElementById('modalText');
const GRIDSTACK_ROOT = d3.select('.gridstackRoot');
const ADD_WIDGET_BUTTON = d3.select('#addWidgetButton');
const EDIT_LAYOUT_BUTTON = d3.select('#editLayoutButton');
const STOP_EDIT_LAYOUT_BUTTON = d3.select('#stopEditLayoutButton');
const SORT_LAYOUT_BUTTON = d3.select('#sortLayoutButton');

// set page state using cookies
setDarkMode(getCookie(DARKMODE_COOKIE_NAME));
setMenuState(getCookie(MENU_HIDE_STATE_COOKIE_NAME));


if (hasForecast) {
    layout.gridstackWidgets.w4.smpgOpts.smpgCardType  = "Ensemble with Forecast";
    layout.gridstackWidgets.w5.smpgOpts.smpgCardType  = "Seasonal Accumulation Percentiles with Forecast";
}

if (!hasMap) {
    layout.gridstackWidgets.svgMap.smpgOpts.smpgCardType = "Disabled";
}

var gridstackItems = parseGridstackItems(layout);
var gridstackWidgetCount = gridstackItems.length;
var grid = GridStack.init(gridstackBaseLayerOptions);
grid.load(gridstackItems);

var cards = parseWidgets(layout);

const position = { x: 0, y: 0 }

// drag window (parent of card header)
interact('.drag-handle').draggable({
  listeners: {
    start (event) {
      console.log(event.type, event.target)
    },
    move (event) {
      position.x += event.dx
      position.y += event.dy

      event.target.parentElement.style.transform =
        `translate(${position.x}px, ${position.y}px)`
    },
  }
})

var sidebarElements = makeSelectionMenu(datasetProperties['place_ids']); //init places list

window.addEventListener("hashchange", handleNavigation); // update everything when the url changes
window.addEventListener("resize", handleResize);
grid.on("resize resizestop", handleResize);

navigateTo({"place": getHashParamsObject()['place'] || firstPlaceKey});
window.dispatchEvent(new HashChangeEvent('hashchange',
    {
        oldURL: location.href,
        newURL: location.href
    }
)); // initial update
window.dispatchEvent(new Event('resize'));