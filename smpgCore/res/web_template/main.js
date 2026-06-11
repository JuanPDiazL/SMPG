// This file contains the main logic that initializes the page

"use strict";

// Globals
var previousSelectionElement = null;
var resizeTimeout = false; // holder for timeout
var resizeDelay = 300; // debounce delay
var contentHeight = null;
var gridstackWidgetCount = null;
var editingLayout = false;

// Decompress and parse data
var datasetProperties = JSON.parse(decompress(dataset_properties_json));
var parameters = JSON.parse(decompress(parameters_json));
var place_general_stats = csvParse(decompress(place_general_stats_csv));
var place_long_term_stats = parseRowsObjectCsv(decompress(place_long_term_stats_csv_obj));
var seasonal_current_totals = csvParseRows(decompress(seasonal_current_totals_csv));
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
const hasForecast = parameters['forecast_length'] > 0;
const hasSos = parameters['rainy_season_detection_enabled'];

const hasMap = isDeclared("topojson_map") && topojson_map !== null;
const hasReferenceMap = isDeclared("reference_topojson_map") && reference_topojson_map !== null;

const mapFields = ['None', 'Total up to Current Season/LTA Pct.', 
    'Ensemble Med./LTA Pct.', 'Probability Below Normal', 
    'Probability of Normal', 'Probability Above Normal', 
    'Ensemble Med. Pctl.', 'Current Season Pctl.',
    ];
if(hasForecast) {
    mapFields.push('Total up to Forecast/LTA Pct.');
    mapFields.push('Ensemble Med. w Forecast/LTA Pct.');
    mapFields.push('Ensemble Med. Pctl. w/ Forecast');
    mapFields.push('Probability Below Normal w/ Forecast');
    mapFields.push('Probability of Normal w/ Forecast');
    mapFields.push('Probability Above Normal w/ Forecast');
}
if(hasSos) {
    mapFields.push('Start of Season');
    mapFields.push('Start of Season Anomaly');
    if (hasForecast) {
        mapFields.push('Forecast Start of Season');
        mapFields.push('Forecast Start of Season Anomaly');
    }
}

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

const GS_H_RES = 12;
const GS_V_RES = 8;
const GS_H_CELL_SIZE = Math.round((1/3) * GS_H_RES);
const GS_V_CELL_SIZE = Math.round((1/2) * GS_V_RES);

var gridstackOptions = {
    animate: false,
    float: true,
    // row: 6,
    column: GS_H_RES,
    // handle: ".card-header",
    resizable: { handles: 'all'},
    staticGrid: true,
    columnOpts: {
        breakpointForWindow: false,
        layout: 'list',
        columnMax: GS_H_RES,
        breakpoints: [
            {w:800,  c:GS_H_CELL_SIZE*1},
            {w:1100, c:GS_H_CELL_SIZE*2},
            {w:1280, c:GS_H_CELL_SIZE*3},
        ]
    },
};
if (hasMap) {
    var gridstackItems = [
        {
            id: "item2",
            w: GS_H_CELL_SIZE,
            h: GS_V_CELL_SIZE*2,
        },
        {
            id: "item1",
            w: GS_H_CELL_SIZE,
            h: GS_V_CELL_SIZE,
        },
        {
            id: "item3",
            w: GS_H_CELL_SIZE,
            h: GS_V_CELL_SIZE,
        },
        {
            id: "item4",
            w: GS_H_CELL_SIZE,
            h: GS_V_CELL_SIZE,
        },
        {
            id: "item5",
            w: GS_H_CELL_SIZE,
            h: GS_V_CELL_SIZE,
        },
    ];
} else {
    var gridstackItems = [
        {
            id: "item1",
            w: GS_H_CELL_SIZE*1.5,
            h: GS_V_CELL_SIZE,
        },
        {
            id: "item3",
            w: GS_H_CELL_SIZE*1.5,
            h: GS_V_CELL_SIZE,
        },
        {
            id: "item4",
            w: GS_H_CELL_SIZE*1.5,
            h: GS_V_CELL_SIZE,
        },
        {
            id: "item5",
            w: GS_H_CELL_SIZE*1.5,
            h: GS_V_CELL_SIZE,
        },
    ];
}
gridstackWidgetCount = gridstackItems.length;
var grid = GridStack.init(gridstackOptions);
grid.load(gridstackItems);

// set page state using cookies
setDarkMode(getCookie(DARKMODE_COOKIE_NAME));
setMenuState(getCookie(MENU_HIDE_STATE_COOKIE_NAME));

var cards = [
    new chartCard('[gs-id="item1"] .grid-stack-item-content', "Seasonal Accumulations"),
    new chartCard('[gs-id="item3"] .grid-stack-item-content', "Current Year Status"),
    new chartCard('[gs-id="item4"] .grid-stack-item-content', "Ensemble"),
    new chartCard('[gs-id="item5"] .grid-stack-item-content', "Seasonal Accumulation Percentiles"),
];
if (hasMap) {
    cards.push(new chartCard('[gs-id="item2"] .grid-stack-item-content', "Map"));
}

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