"use strict";

const UNCAT_COLOR = '#aaaf';
let mapStatsCategories = {
    '': { 'Uncategorized': {color:UNCAT_COLOR, 'function': () => true} },
    'Total up to Current Season/LTA Pct.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Total up to Forecast/LTA Pct.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Ensemble Med./LTA Pct.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Ensemble Med. w Forecast/LTA Pct.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Probability Below Normal': {
        '0-15': { 'color': '#2b83ba', 'function': (x) => x >= 0 && x < 15 },
        '15-30': { 'color': '#74b7ae', 'function': (x) => x >= 15 && x < 30 },
        '30-45': { 'color': '#e7f6b8', 'function': (x) => x >= 30 && x < 45 },
        '45-60': { 'color': '#ffe8a4', 'function': (x) => x >= 45 && x < 60 },
        '60-75': { 'color': '#feba6e', 'function': (x) => x >= 60 && x < 75 },
        '75-90': { 'color': '#ed6e43', 'function': (x) => x >= 75 && x < 90 },
        '90-100': { 'color': '#d7191c', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Below Normal w/ Forecast': {
        '0-15': { 'color': '#2b83ba', 'function': (x) => x >= 0 && x < 15 },
        '15-30': { 'color': '#74b7ae', 'function': (x) => x >= 15 && x < 30 },
        '30-45': { 'color': '#e7f6b8', 'function': (x) => x >= 30 && x < 45 },
        '45-60': { 'color': '#ffe8a4', 'function': (x) => x >= 45 && x < 60 },
        '60-75': { 'color': '#feba6e', 'function': (x) => x >= 60 && x < 75 },
        '75-90': { 'color': '#ed6e43', 'function': (x) => x >= 75 && x < 90 },
        '90-100': { 'color': '#d7191c', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability of Normal': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability of Normal w/ Forecast': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Above Normal': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Above Normal w/ Forecast': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Ensemble Med. Pctl.': {
        '0-3': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-6': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-11': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-21': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-33': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-67': { 'color': '#e0e0e0', 'function': (x) => x >= 33 && x < 67 },
        '67-90': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
        '≥90': { 'color': '#1f78b4', 'function': (x) => x >= 90 },
    },
    'Ensemble Med. Pctl. w/ Forecast': {
        '0-3': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-6': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-11': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-21': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-33': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-67': { 'color': '#e0e0e0', 'function': (x) => x >= 33 && x < 67 },
        '67-90': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
        '≥90': { 'color': '#1f78b4', 'function': (x) => x >= 90 },
    },
    'Current Season Pctl.': {
        '0-3': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-6': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-11': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-21': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-33': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-67': { 'color': '#e0e0e0', 'function': (x) => x >= 33 && x < 67 },
        '67-90': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
        '≥90': { 'color': '#1f78b4', 'function': (x) => x >= 90 },
    },
    'Start of Season Anomaly': {
        'Yet to Start': { 'color': '#FFF77D', 'function': (x) => x === 'Yet to Start'},
        '≥4 Dk. Early': { 'color': '#004280', 'function': (x) => x === '≥4 Dekads Early' },
        '3 Dk. Early': { 'color': '#0073F0', 'function': (x) => x === '3 Dekads Early' },
        '2 Dk. Early': { 'color': '#008FF5', 'function': (x) => x === '2 Dekads Early' },
        '1 Dk. Early': { 'color': '#00A6F5', 'function': (x) => x === '1 Dekads Early' },
        'Average': { 'color': '#CCCCCC', 'function': (x) => x === 'Average' },
        '1 Dk. Late': { 'color': '#FFD4E6', 'function': (x) => x === '1 Dekads Late' },
        '2 Dk. Late': { 'color': '#FFC78F', 'function': (x) => x === '2 Dekads Late' },
        '3 Dk. Late': { 'color': '#FF734A', 'function': (x) => x === '3 Dekads Late' },
        '≥4 Dk. Late': { 'color': '#BA0070', 'function': (x) => x === '≥4 Dekads Late' },
    },
    'Forecast Start of Season Anomaly': {
        'Yet to Start': { 'color': '#FFF77D', 'function': (x) => x === 'Yet to Start'},
        '≥4 Dk. Early': { 'color': '#004280', 'function': (x) => x === '≥4 Dekads Early' },
        '3 Dk. Early': { 'color': '#0073F0', 'function': (x) => x === '3 Dekads Early' },
        '2 Dk. Early': { 'color': '#008FF5', 'function': (x) => x === '2 Dekads Early' },
        '1 Dk. Early': { 'color': '#00A6F5', 'function': (x) => x === '1 Dekads Early' },
        'Average': { 'color': '#CCCCCC', 'function': (x) => x === 'Average' },
        '1 Dk. Late': { 'color': '#FFD4E6', 'function': (x) => x === '1 Dekads Late' },
        '2 Dk. Late': { 'color': '#FFC78F', 'function': (x) => x === '2 Dekads Late' },
        '3 Dk. Late': { 'color': '#FF734A', 'function': (x) => x === '3 Dekads Late' },
        '≥4 Dk. Late': { 'color': '#BA0070', 'function': (x) => x === '≥4 Dekads Late' },
    },
};

const mapDescriptions = {
    "Total up to Current Season/LTA Pct.": "Depicts the percent of the long-term average (LTA) for the accumulated precipitation from the Start of Season (SOS) up to the current period.",
    "C.Dk./LTA PC.Dk. + Forecast/LTA Pct.": "Depicts the percent of average for the accumulated precipitation from the Start of Season (SOS) up to the current period, including the forecast.",
    "Current Season Pctl.": "Shows the percentile rank of the accumulated precipitation from the SOS up to the current period, based on historical data.",
    "Ensemble Med. Pctl.": "Depicts the percentile rank of the median value of all possible outcomes at the End of Season (EOS). The ensemble is created using historical data from selected years (from Section 4) to simulate a range of potential outcomes.",
    "Ensemble Med./LTA Pct.": "Displays the percent of average for the EOS median value of all possible outcomes compared against the long-term average (LTA).",
    "Probability Below Normal": "This map displays the probability of the season's outcome below the 33rd percentile of the historical distribution.",
    "Probability of Normal": "This map displays the probability of the season's outcome between the 33rd and 67th percentiles.",
    "Probability Above Normal": "This map displays the probability of the season's outcome above the 67th percentile of the historical distribution.",
    "Start of Season": "These maps show when the start of a rainy season has begun (for instance: Mar-1). The results of these maps depend on the selected method, and its parameters.",
    "Start of Season Anomaly": "This map shows how many periods the Start of season differs from the average (for instance: 2 Dekads Early)."
};

const sosClassColors = [
    '#FFF77D', 
    '#DFD75D', 
    '#6E00C9', 
    '#BF4FE0', 
    '#E3ADF5', 
    '#0094AD', 
    '#21D6FF', 
    '#8CF2FF', 
    '#00BD2E', 
    '#A1FF96', 
    '#A3FFCC', 
    '#F07500', 
    '#FF9126', 
    '#FFB8AB', 
    '#004DA8', 
    '#005CE6', 
    '#0070FF', 
    '#F7E8CC', 
    '#E6C996', 
    '#CFA836', 
    '#966300'
];

function getSosCategories(suffix='Start') {
    let categoryLabels = [`No ${suffix}`, `Possible ${suffix}`]
        .concat(datasetProperties["sub_season_monitoring_ids"]);
    let sizeCategories = Math.min(categoryLabels.length, sosClassColors.length);
    let varCategoryPairs = zip(categoryLabels, sosClassColors);
    
    let _categories = {};
    for (let i=0; i < varCategoryPairs.length; i++) {
        let label = varCategoryPairs[i][0];
        let color = varCategoryPairs[i][1];
        if (i+1 === sizeCategories && sizeCategories < categoryLabels.length) {
            label = `≥${label}`;
        }
        _categories[label] = {'color': color, 'function': (x) => x === label};
    }
    return _categories
}

let getPlaceMapStats = (place) => {
    return {
        '': () => undefined,
        'Total up to Current Season/LTA Pct.': seasonal_general_stats[place]['Total up to Current Season/LTA Pct.'],
        'Total up to Forecast/LTA Pct.': seasonal_general_stats[place]['Total up to Forecast/LTA Pct.'],
        'Ensemble Med./LTA Pct.': selected_seasons_general_stats[place]['Ensemble Med./LTA Pct.'],
        'Ensemble Med. w Forecast/LTA Pct.': selected_seasons_general_stats[place]['Ensemble Med. w Forecast/LTA Pct.'],
        'Probability Below Normal': selected_seasons_general_stats[place]['Probability Below Normal'],
        'Probability Below Normal w/ Forecast': selected_seasons_general_stats[place]['Probability Below Normal w/ Forecast'],
        'Probability of Normal': selected_seasons_general_stats[place]['Probability of Normal'],
        'Probability of Normal w/ Forecast': selected_seasons_general_stats[place]['Probability of Normal w/ Forecast'],
        'Probability Above Normal': selected_seasons_general_stats[place]['Probability Above Normal'],
        'Probability Above Normal w/ Forecast': selected_seasons_general_stats[place]['Probability Above Normal w/ Forecast'],
        'Ensemble Med. Pctl.': selected_seasons_general_stats[place]['Ensemble Med. Pctl.'],
        'Ensemble Med. Pctl. w/ Forecast': selected_seasons_general_stats[place]['Ensemble Med. Pctl. w/ Forecast'],
        'Current Season Pctl.': place_general_stats[place]['Current Season Pctl.'],
        'Start of Season': place_general_stats[place]['Start of Season'],
        'Start of Season Anomaly': place_general_stats[place]['Start of Season Anomaly'],
        'Forecast Start of Season': place_general_stats[place]['Forecast Start of Season'],
        'Forecast Start of Season Anomaly': place_general_stats[place]['Forecast Start of Season Anomaly'],
    };
};

function makeD3Map(containerElement) {
    var topoJsonObjectMap = JSON.parse(decompress(topojson_map));
    if (hasReferenceMap) {
        var referenceTopoJsonObjectMap = JSON.parse(decompress(reference_topojson_map));
    } else {
        var referenceTopoJsonObjectMap = topoJsonObjectMap;
    }

    let mapJson = topojson.feature(topoJsonObjectMap, topoJsonObjectMap.objects.map);
    let referenceMapJson = topojson.feature(referenceTopoJsonObjectMap, referenceTopoJsonObjectMap.objects.map);

    // Populate stat selects
    let property_ids = Object.keys(Object.values(mapJson["features"])[0]["properties"]);
    fieldId = parameters["target_id_field"];
    updateSelect(featureSelect, property_ids);
    updateSelect(colorSelect, mapFields);

    // Prepare categories
    mapStatsCategories["Start of Season"] = getSosCategories(); 
    mapStatsCategories["Forecast Start of Season"] = getSosCategories();
    featureSelect.value = fieldId;

    const map = new d3Map(containerElement, mapJson, referenceMapJson);
    return map;
}

class d3Map {
    constructor(containerElement, geoJsonMap, geoJsonReferenceMap) {
        const layerArea = d3.geoArea(geoJsonReferenceMap);
        const layerBounds = d3.geoBounds(geoJsonReferenceMap);

        const FONT_SIZE = 13;
        let internal_width = 800;
        let internal_height = 800;

        // Create SVG container
        const svg = containerElement.append("svg")
            .attr("id", "#mapSvg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0, 0, ${internal_width}, ${internal_height}`)

        const projection = d3.geoMercator()
        .fitSize([internal_width, internal_height], geoJsonReferenceMap); // Fit the map to the SVG viewport size

        // define tooltip
        const tooltip = d3.select("#mapTooltipText")

        // Draw the map
        const referencePolygons = svg.append("g")
            .attr("id", "#referenceMapPolygons")
            .attr("class", "zoomable")
            .selectAll(".country")
            .data(geoJsonReferenceMap.features)
            .enter().append("path")
            .attr("class", d => `reference-polygon`)
            .attr("d", d3.geoPath().projection(projection))
            .style("fill", "#ffff")

        const polygons = svg.append("g")
            .attr("id", "#mapPolygons")
            .attr("class", "zoomable")
            .selectAll(".country")
            .data(geoJsonMap.features)
            .enter().append("path")
            .attr("class", d => `country country-${d.properties[fieldId]} w3-ripple`)
            .attr("d", d3.geoPath().projection(projection))
            .style("fill", UNCAT_COLOR)
            .on("mouseover", (event, d) => {
                mapSelectorPath
                .attr("d", d3.geoPath().projection(projection)(d))
                .style("display", null)
                let displayLabeltext = d.properties[featureSelect.value];
                const idText = d.properties[fieldId]
                displayLabeltext += displayLabeltext === idText? "" : ` (${idText})`
                tooltip.text(displayLabeltext);
            })
            .on("mouseout", (event, d) => {
                mapSelectorPath
                .style("display", "none")
                tooltip.text("None");
            })
            .on("click", (event, d) => {
                mapPersistentSelectorPath
                .attr("d", d3.geoPath().projection(projection)(d))
                .style("display", null)
                navigateTo({"place": d.properties[fieldId], "mode": "plots"});
            })

        // draw selection bounding box rectangle
        const mapPersistentSelectorPath = svg.append("g")
            .attr("id", "#mapPersistentSelector")
            .attr("class", "zoomable")
            .append("path")
            .attr("class","persistent-selection-path")
        const mapSelectorPath = svg.append("g")
            .attr("id", "#mapSelector")
            .attr("class", "zoomable")
            .append("path")
            .attr("class","selection-path")

        const polygonTooltips = polygons.append("title")
            .attr("class", "country-polygon-tooltip")
            .text(d => d.properties[fieldId])
            
        // draw labels
        const labels = svg.append("g")
            .attr("id", "#mapLabels")
            .attr("class", "zoomable")
            .selectAll(".map-text-label")
            .data(geoJsonMap.features)
            .enter().append("text")
            .text(d => d.properties[fieldId])
            .attr("class", "map-text-label svg-outline-text")
            .attr("transform", d => `translate(${projection(d3.geoCentroid(d))})`)
            .attr("font-size", FONT_SIZE)
            .style("dominant-baseline", "middle")
            // .style("text-anchor", "middle")
            .style("display", d => {
                const areaRatio = d3.geoArea(d) / layerArea;
                const xRatio = (d.bbox[2] - d.bbox[0]) / (layerBounds[1][0] - layerBounds[0][0]);
                return areaRatio > 0.004 && xRatio > 0.08 ? null : "none"
            })

        const legend = svg.append("g").attr("id", "#mapLegend");

        // Define the zoom behavior
        const svgZoomHandler = d3.zoom()
        .on('zoom', (event) => {
            const transform = event.transform;
            const viewWidth = (internal_width*transform.k);
            const viewHeight = (internal_height*transform.k);
            
            // Calculate zoom bounds
            const overlap = 0.9;
            transform.k = Math.max(overlap, transform.k);
            transform.x = Math.max((internal_width * overlap) - viewWidth, transform.x);
            transform.x = Math.min(internal_width * (1 - overlap), transform.x);
            transform.y = Math.max((internal_height * overlap) - viewHeight, transform.y);
            transform.y = Math.min(internal_height * (1 - overlap), transform.y);

            svg.selectAll(".zoomable")
            .attr('transform', transform);
        });
        svg.call(svgZoomHandler);

        featureSelect.on("change", (event) => {
            const displayId = event.target.value;
            
            // Update label text based on the selected property
            labels.text(d => d.properties[displayId]);
            polygonTooltips.text(d => d.properties[displayId]);
        });
        showLegendCheckBox
            .attr("checked", "checked")
            .on("change", (event) => {
                const showLegend = event.target.checked;
                legend.style("display", showLegend? null : "none");
            });
        resetMapViewportButton.on("click", (event) => {
            svg.call(svgZoomHandler.transform, d3.zoomIdentity)
        });
        colorSelect
            .attr("value", "")
            .on("change", (event) => {
                const selectedStatId = event.target.value;
                const selectedBins = mapStatsCategories[selectedStatId];
                // Update legend based on the selected property
                const legendElementHeight = 16;
                const legendElementGap = 1;
                const startY = internal_height - 30;
                const startX = internal_width - 30;
                const coordX = startX;

                legend.selectChildren().remove()
                legend.selectAll().append("g")
                    .data(Object.entries(selectedBins))
                    .join("g")
                    .attr("class", "legend-element")
                    .attr("transform", (d, i, nodes) => {
                        const offset = nodes.length - i - 1;
                        const coordY = startY - (offset * (legendElementHeight + legendElementGap));
                        return `translate(${coordX},${coordY})`;
                    })
                    .call(g => { //populate legend elements
                        g.append("rect")
                            .attr("width", 16)
                            .attr("height", 16)
                            .attr("fill", d => d[1].color);
                            // .attr("stroke", "#000f")
                            // .attr("stroke-width", 1)
                        g.append("text")
                            .attr("class", "legend-labels svg-outline-text")
                            .attr("x", -4)
                            .attr("y", 9)
                            .attr("dy", "0")
                            .attr("font-size", FONT_SIZE)
                            .attr("text-anchor", "end")
                            .style("dominant-baseline", "middle")
                            .text(d => d[0]);
                        })
                    .call(g => { // add title
                        const offset = g.size() - 1;
                        const coordY = startY - (offset * (legendElementHeight + legendElementGap));
                        legend.append("text")
                            .text(selectedStatId)
                            .attr("class", "legend-title svg-outline-text")
                            .attr("x", 20)
                            .attr("y", -9)
                            .attr("dy", "0")
                            .attr("font-size", FONT_SIZE)
                            .attr("text-anchor", "end")
                            .style("dominant-baseline", "middle")
                            .attr("transform", `translate(${coordX},${coordY})`)
                        })
                    .each((d, i, nodes) => {
                        // console.log(nodes[i].getBoundingClientRect().width);
                    })
                    
                // Update polygon color based on the selected property
                let hasUncategorizedPolygons = false;
                polygons.style("fill", d => {
                    let category = "Uncategorized";

                    if (datasetProperties['place_ids'].includes(String(d.properties[fieldId]))) {
                        const value = getPlaceMapStats(d.properties[fieldId])[selectedStatId];
                        category = categorizeValue(value, selectedBins);
                    }
                    // check if there is any uncategorized polygon
                    hasUncategorizedPolygons |= (category === "Uncategorized");
                    
                    if (selectedStatId === "") {
                        return UNCAT_COLOR;
                    }
                    if (category === "Uncategorized") {
                        return mapStatsCategories[""]["color"];
                    }
                    return selectedBins[category]["color"];
                });
                if (hasUncategorizedPolygons && selectedStatId !== "") {
                    // add a legend for uncategorized polygons
                    showModal(`There was missing data when drawing map.<br>Please check for a possible mismatch between the dataset and the selected target field from the shapefile.<br>Target Field: ${parameters.target_id_field}`)
                }
                // Update the header text
                HEADER.text(`Dataset: ${datasetProperties.dataset_name}, Stat: ${selectedStatId ? selectedStatId : "None"}`);
                // Update description
                MAP_DESCRIPTION.text(mapDescriptions[selectedStatId]);
                MAP_DESCRIPTION_CONTAINER.classed('w3-hide', !mapDescriptions[selectedStatId]);
            });
    }

    update(index) {

    }
}