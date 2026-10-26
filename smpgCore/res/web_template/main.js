// This file contains the main logic that initializes the page

"use strict";

// Globals
var previousSelectionElement = null;
var resizeTimeout = false; // holder for timeout
var resizeDelay = 300; // debounce delay
var contentHeight = null;
var editingLayout = false;
var maximizedCard = null; // the card filling the report, see setMaximizedCard()
// Edit mode (#edit_mode=true) shows the controls that change the report; reader mode, the
// default, hides them (see setReportEditMode()). Reader mode offers to switch to edit mode when
// the address has an edit_mode parameter, whatever its value (see handleNavigation()).
var reportEditMode = getHashParamsObject()["edit_mode"] === "true";
// Whether edit mode was used in this visit: leaving the page then warns about an unsaved layout,
// also from reader mode (see layoutHasUnsavedChanges())
var reportEditModeUsed = reportEditMode;

// Decompress and parse data
var datasetProperties = JSON.parse(decompress(dataset_properties_json));
var parameters = JSON.parse(decompress(parameters_json));
var place_general_stats = csvParse(decompress(place_general_stats_csv));
var place_long_term_stats = parseRowsObjectCsv(decompress(place_long_term_stats_csv_obj));
var seasonal_current_totals = csvParseRows(decompress(seasonal_current_totals_csv));
// Each past year's total up to the current period as a percent of the LTA up to it
var seasonal_pct_of_avg = csvParse(decompress(seasonal_pct_of_avg_csv));
var seasonal_forecast_totals = csvParseRows(decompress(seasonal_forecast_totals_csv));
var seasonal_general_stats = csvParse(decompress(seasonal_general_stats_csv));
var selected_seasons_general_stats = csvParse(decompress(selected_seasons_general_stats_csv));
var seasonal_cumsum = parseRowsObjectCsv(decompress(seasonal_cumsum_csv_obj));
var seasonal_ensemble = parseRowsObjectCsv(decompress(seasonal_ensemble_csv_obj));
var seasonal_long_term_stats  = parseRowsObjectCsv(decompress(seasonal_long_term_stats_csv_obj));
var seasonal_series = parseRowsObjectCsv(decompress(seasonal_series_csv_obj));
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
// The current season was left empty: each selected year is one scenario of the season
const ignoreCurrentSeason = parameters['ignore_current_season'] === true;

const hasMap = isDeclared("topojson_map") && topojson_map !== null;
const hasReferenceMap = isDeclared("reference_topojson_map") && reference_topojson_map !== null;

// The map statistics that don't need a current season
const IGNORED_CURRENT_SEASON_MAP_FIELDS = [
    'None',
    'Average Total',
    'Ensemble Med. Pct. of Avg.',
    'Probability Below Normal',
    'Probability of Normal',
    'Probability Above Normal',
    'Ensemble Med. Pctl.',
];
// A map showing another statistic shows this one instead, see d3Map.changeLegend()
const IGNORED_CURRENT_SEASON_DEFAULT_MAP_FIELD = 'Ensemble Med. Pct. of Avg.';

const mapFields = ignoreCurrentSeason ? IGNORED_CURRENT_SEASON_MAP_FIELDS : [
    'None',
    'Current Accumulation to Present',
    'Average Total',
    'Current Period Pct. of Avg.',
    'Total up to Current Period Pct. of Avg.',
    'Ensemble Med. Pct. of Avg.',
    'Probability Below Normal',
    'Probability of Normal',
    'Probability Above Normal',
    'Ensemble Med. Pctl.',
    'Current Season Pctl.',
    ...(hasForecast ? [
        'Forecast Pctl.',
        'Total up to Forecast Pct. of Avg.',
        'Ensemble Med. w Forecast Pct. of Avg.',
        'Ensemble Med. Pctl. w. Forecast',
        'Probability Below Normal w. Forecast',
        'Probability of Normal w. Forecast',
        'Probability Above Normal w. Forecast',
    ] : []),
    ...(hasForecast ? ['Forecast 1st Period Pct. of Avg.'] : []),
    ...(hasForecast >= 2 ? ['Forecast Accumulation Pct. of Avg.'] : []),
    ...(hasForecast >= 3 ? ['Forecast 3rd Period Pct. of Avg.'] : []),
    ...(hasSos ? [
        'Start of Season',
        'Start of Season Anomaly'] : []),
    ...(hasSos && hasForecast ? [
        'Forecast Start of Season',
        'Forecast Start of Season Anomaly'] : []),
];

// The place in the address when there is data for it, so the cards are built for it (see
// handleNavigation() for the message about a place without data)
var currentDataIndex = datasetProperties['place_ids'].includes(getHashParamsObject()['place'])
    ? getHashParamsObject()['place'] : firstPlaceKey;

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
    // Each layer's borders, split among its polygons so a border between two places is drawn once
    var mapBorders = getPolygonBorders(topoJsonObjectMap, topoJsonObjectMap.objects.map);
    // Without a reference map, the reference layer is the map itself
    var referenceMapBorders = hasReferenceMap
        ? getPolygonBorders(referenceTopoJsonObjectMap, referenceTopoJsonObjectMap.objects.map)
        : mapBorders;

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
console.log('seasonal_pct_of_avg', seasonal_pct_of_avg);
console.log('seasonal_general_stats', seasonal_general_stats);
console.log('selected_seasons_general_stats', selected_seasons_general_stats);
console.log('seasonal_cumsum', seasonal_cumsum);
console.log('seasonal_ensemble', seasonal_ensemble);
console.log('seasonal_long_term_stats', seasonal_long_term_stats);
console.log('seasonal_series', seasonal_series);
console.log('selected_seasons_cumsum', selected_seasons_cumsum);
console.log('selected_seasons_ensemble', selected_seasons_ensemble);
console.log('selected_seasons_ensemble_with_forecast', selected_seasons_ensemble_with_forecast);
console.log('selected_seasons_long_term_stats', selected_seasons_long_term_stats);

// HTML Elements
const BODY = document.body;
const HEADER = d3.select('#contentHeaderText');
const GRIDSTACK_ROOT = d3.select('.gridstackRoot');
BODY.classList.toggle(REPORT_READER_MODE_CLASS, !reportEditMode);

const HEADER_MENU_ITEMS = {
    "Dark mode": { icon: "dark_mode", onclick: () => toggleDarkMode() },
    "Save screenshot": { icon: "save", onclick: () => save_reports() },
    "About this data": { icon: "info", onclick: () => openAboutDataDialog() },
    "Help": { icon: "help", onclick: () => window.open('https://help.fews.net/en/tools/v3/smpg-tool', '_blank') },
    "Switch to reader mode": { icon: "chrome_reader_mode", onclick: () => navigateTo({ edit_mode: "false" }),
        className: REPORT_EDIT_ONLY_CLASS },
    "Switch to edit mode": { icon: "edit_note", onclick: () => navigateTo({ edit_mode: "true" }),
        hidden: reportEditMode || !("edit_mode" in getHashParamsObject()) },
    "Save layout": { icon: "file_upload", onclick: () => openSaveLayoutDialog(), className: REPORT_EDIT_ONLY_CLASS },
    "Edit layout": { icon: "edit", onclick: () => toggleLayoutEdit(), className: REPORT_EDIT_ONLY_CLASS },
    "Stop edit layout": { icon: "edit_off", onclick: () => toggleLayoutEdit(), hidden: true,
        className: REPORT_EDIT_ONLY_CLASS },
    "Sort layout": { icon: "swap_horiz", onclick: () => grid.compact(), hidden: true,
        className: REPORT_EDIT_ONLY_CLASS },
    "Add widget": { icon: "add", onclick: () => add_widget(), hidden: true, className: REPORT_EDIT_ONLY_CLASS },
};
const HEADER_MENU_ELEMENTS = buildHeaderMenu('#contentHeaderMenu', HEADER_MENU_ITEMS, refreshRestoreWidgetMenu);
setupMaximizedCardEscape();
buildYearInViewSelector();
const EDIT_LAYOUT_BUTTON = HEADER_MENU_ELEMENTS["Edit layout"];
const STOP_EDIT_LAYOUT_BUTTON = HEADER_MENU_ELEMENTS["Stop edit layout"];
const SORT_LAYOUT_BUTTON = HEADER_MENU_ELEMENTS["Sort layout"];
const ADD_WIDGET_BUTTON = HEADER_MENU_ELEMENTS["Add widget"];
const SWITCH_TO_EDIT_MODE_BUTTON = HEADER_MENU_ELEMENTS["Switch to edit mode"];

// set page state using cookies
setDarkMode(getCookie(DARKMODE_COOKIE_NAME));
setMenuState(getCookie(MENU_HIDE_STATE_COOKIE_NAME));


// Each forecast card's regular variant
const FORECAST_CARD_REGULAR_TYPES = {
    "Ensemble with Forecast": "Ensemble",
    "Seasonal Accumulation Percentiles with Forecast": "Seasonal Accumulation Percentiles",
};

// The layout's cards fit this report: without a forecast, the forecast cards show their regular
// variant; without a map, the maps are empty widgets
for (const widget of Object.values(layout.gridstackWidgets)) {
    const smpgOpts = widget.smpgOpts;
    if (!hasForecast && smpgOpts.smpgCardType in FORECAST_CARD_REGULAR_TYPES) {
        smpgOpts.smpgCardType = FORECAST_CARD_REGULAR_TYPES[smpgOpts.smpgCardType];
    }
    if (!hasMap && smpgOpts.smpgCardType === "Map") {
        smpgOpts.smpgCardType = "Empty Widget";
    }
}

var gridstackItems = parseGridstackItems(layout);
var gridstackWidgetCount = getHighestWidgetNumber(layout); // unloaded widgets' ids stay taken
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

// Hide loading overlay now that the initial render is complete
var loadingOverlay = document.getElementById('loadingOverlay');
loadingOverlay.classList.add('loading-done');
loadingOverlay.addEventListener('transitionend', function () {
    loadingOverlay.remove();
}, { once: true });

// The layout as loaded is the saved one; leaving the page with changes to it asks first (the
// browser shows its own message). Readers can't save a layout, so they aren't asked.
markLayoutSaved();
window.addEventListener("beforeunload", (event) => {
    if (reportEditModeUsed && layoutHasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = ""; // older browsers ask only with returnValue set
    }
});