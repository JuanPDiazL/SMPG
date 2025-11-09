"use strict";

const UNCAT_COLOR = '#aaaf';
let categories = {
    '': { 'Uncategorized': {color:UNCAT_COLOR, 'function': () => true} },
    'C. Dk./LTA Pct.': {
        '0-19': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-109': { 'color': '#f2f2f2', 'function': (x) => x >= 90 && x < 110 },
        '110-119': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-139': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-159': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'C. Dk.+Forecast/LTA Pct.': {
        '0-19': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-109': { 'color': '#f2f2f2', 'function': (x) => x >= 90 && x < 110 },
        '110-119': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-139': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-159': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Ensemble Med./LTA Pct.': {
        '0-19': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-109': { 'color': '#f2f2f2', 'function': (x) => x >= 90 && x < 110 },
        '110-119': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-139': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-159': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Probability Below Normal': {
        '0-14': { 'color': '#2b83ba', 'function': (x) => x >= 0 && x < 15 },
        '15-29': { 'color': '#74b7ae', 'function': (x) => x >= 15 && x < 30 },
        '30-44': { 'color': '#e7f6b8', 'function': (x) => x >= 30 && x < 45 },
        '45-59': { 'color': '#ffe8a4', 'function': (x) => x >= 45 && x < 60 },
        '60-74': { 'color': '#feba6e', 'function': (x) => x >= 60 && x < 75 },
        '75-89': { 'color': '#ed6e43', 'function': (x) => x >= 75 && x < 90 },
        '90-100': { 'color': '#d7191c', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability of Normal': {
        '0-19': { 'color': '#e6e6e6', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Above Normal': {
        '0-19': { 'color': '#e6e6e6', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Ensemble Med. Pctl.': {
        '0-2': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-5': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-10': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-20': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-32': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-66': { 'color': '#f2f2f2', 'function': (x) => x >= 33 && x < 67 },
        '67-89': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
        '≥90': { 'color': '#1f78b4', 'function': (x) => x >= 90 },
    },
    'Current Season Pctl.': {
        '0-2': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-5': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-10': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-20': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-32': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-66': { 'color': '#f2f2f2', 'function': (x) => x >= 33 && x < 67 },
        '67-89': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
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
const getSosCategories = () => Object.fromEntries(sosClassColors.map((value, index, array) => {
    let key, color = value, fun;
    if (index === 0) {
        key = "No Start";
        fun = (x) => x === "No Start";
    } else if (index === 1) {
        key = "Possible St.";
        fun = (x) => x === "Possible Start";
    } else if (index === 2) {
        key = `≤${datasetProperties["sub_season_ids"][3]}`;
        fun = (x) => x === key;
    } else if (index === 20) {
        key = `≥${datasetProperties["sub_season_ids"][21]}`;
        fun = (x) => x === key;
    } else {
        key = datasetProperties["sub_season_ids"][index+1];
        fun = (x) => x === key;
    }
    return [key, {"color": color, "function": fun}]
}));

function drawMap(mapGeoJson, referenceMapGeoJson) {
    categories["Start of Season"] = getSosCategories(); // prepare some needed data
    const layerArea = d3.geoArea(referenceMapGeoJson);
    const layerBounds = d3.geoBounds(referenceMapGeoJson);

    const FONT_SIZE = 13;
    let width = 800;
    let height = 800;

    let mapStats = {
        '': () => undefined,
        'C. Dk./LTA Pct.': (col) => selected_seasons_general_stats[col]['C. Dk./LTA Pct.'],
        'C. Dk.+Forecast/LTA Pct.': (col) => selected_seasons_general_stats[col]['C. Dk.+Forecast/LTA Pct.'],
        'Ensemble Med./LTA Pct.': (col) => selected_seasons_general_stats[col]['Ensemble Med./LTA Pct.'],
        'Probability Below Normal': (col) => selected_seasons_general_stats[col]['E. Prob. Below Normal Pct.'],
        'Probability of Normal': (col) => selected_seasons_general_stats[col]['E. Prob. of Normal Pct.'],
        'Probability Above Normal': (col) => selected_seasons_general_stats[col]['E. Prob. Above Normal Pct.'],
        'Ensemble Med. Pctl.': (col) => selected_seasons_general_stats[col]['Ensemble Med. Pctl.'],
        'Current Season Pctl.': (col) => place_general_stats[col]['Current Season Pctl.'],
        'Start of Season': (col) => place_general_stats[col]['Start of Season'],
        'Start of Season Anomaly': (col) => place_general_stats[col]['Start of Season Anomaly'],
    }

    const projection = d3.geoMercator()
    .fitSize([width, height], referenceMapGeoJson); // Fit the map to the SVG viewport size
    // Select an SVG container
    const svg = d3.select("#mapSvg")
        .attr("width", width)
        .attr("height", height)

    // const shadow = svg.select("#mapDefs")
    //     .append("filter")
    //     .attr("id", "shadow")
    //     .append("feDropShadow")
    //     .attr("dx", 3)
    //     .attr("dy", 3)
    //     .attr("stdDeviation", 0)
    //     .attr("flood-color", "rgb(0,0,0)")
    //     .attr("flood-opacity", 1)

    // define tooltip
    const tooltip = d3.select("#mapTooltipText")

    // Draw the map
    const referencePolygons = svg.append("g")
        .attr("id", "#referenceMapPolygons")
        .attr("class", "zoomable")
        .selectAll(".country")
        .data(referenceMapGeoJson.features)
        .enter().append("path")
        .attr("class", d => `reference-polygon`)
        .attr("d", d3.geoPath().projection(projection))
        .style("fill", "#ffff")

    const polygons = svg.append("g")
        .attr("id", "#mapPolygons")
        .attr("class", "zoomable")
        .selectAll(".country")
        .data(mapGeoJson.features)
        .enter().append("path")
        .attr("class", d => `country country-${d.properties[fieldId]} w3-ripple`)
        .attr("d", d3.geoPath().projection(projection))
        .style("fill", UNCAT_COLOR)
        .on("mouseover", (event, d) => {
            mapSelectorPath
            .attr("d", d3.geoPath().projection(projection)(d))
            .style("display", null)
            let displayLabeltext = d.properties[selectNode.value];
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
        .data(mapGeoJson.features)
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

    svg
    .attr("width", null)
    .attr("height", null)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `0, 0, ${width}, ${height}`)

    const svgZoomHandler = d3.zoom()
    .on('zoom', (event) => {
        const transform = event.transform;
        const viewWidth = (width*transform.k);
        const viewHeight = (height*transform.k);
        
        // Calculate bounds for zooming
        const overlap = 0.9;
        transform.k = Math.max(overlap, transform.k);
        transform.x = Math.max((width * overlap) - viewWidth, transform.x);
        transform.x = Math.min(width * (1 - overlap), transform.x);
        transform.y = Math.max((height * overlap) - viewHeight, transform.y);
        transform.y = Math.min(height * (1 - overlap), transform.y);

        svg.selectAll(".zoomable")
        .attr('transform', transform);
    });

    svg.call(svgZoomHandler);

    selectNode.addEventListener("change", function() {
        const displayId = this.value;
        // Update label text based on the selected property
        labels.text(d => d.properties[displayId]);
        polygonTooltips.text(d => d.properties[displayId]);
    });
    legendCbNode.addEventListener("change", function() {
        const showLegend = this.checked;
        legend.style("display", showLegend? null : "none");
    });
    resetMapViewportButton.addEventListener("click", function() {
        svg.call(svgZoomHandler.transform, d3.zoomIdentity)
    });
    colorNode.addEventListener("change", function() {
        const selectedStatId = this.value;
        const selectedStats = mapStats[selectedStatId];
        const selectedBins = categories[selectedStatId];
        // Update legend based on the selected property
        const legendElementHeight = 16;
        const legendElementGap = 1;
        const startY = height - 30;
        const startX = width - 30;
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
                console.log(nodes[i].getBoundingClientRect().width);
            })
            
        // Update polygon color based on the selected property
        let hasUncategorizedPolygons = false;
        polygons.style("fill", d => {
            let category = "Uncategorized";

            if (datasetProperties['place_ids'].includes(String(d.properties[fieldId]))) {
                const value = selectedStats(d.properties[fieldId]);
                category = categorizeValue(value, selectedBins);
            }
            // check if there is any uncategorized polygon
            hasUncategorizedPolygons |= (category === "Uncategorized");
            
            if (selectedStatId === "") {
                return UNCAT_COLOR;
            }
            if (category === "Uncategorized") {
                return categories[""]["color"];
            }
            return selectedBins[category]["color"];
        });
        if (hasUncategorizedPolygons && selectedStatId !== "") {
            // add a legend for uncategorized polygons
            showModal(`There was missing data when drawing map.<br>Please check for a possible mismatch between the dataset and the selected target field from the shapefile.<br>Target Field: ${parameters.target_id_field}`)
        }
        // Update the header text
        HEADER.textContent = `Dataset: ${datasetProperties.dataset_name}, Stat: ${this.value ? this.value : "None"}`;
    });
}