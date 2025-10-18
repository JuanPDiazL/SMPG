"use strict";

function drawMap(mapGeoJson, referenceMapGeoJson) {
    const layerArea = d3.geoArea(referenceMapGeoJson);
    const layerBounds = d3.geoBounds(referenceMapGeoJson);

    const FONT_SIZE = 13;
    let divElement = $("#mapRoot");
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
        .attr("class", "map-text-label")
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
        legend.selectChildren().remove()
        legend.selectAll()
            .data(Object.entries(selectedBins))
            .join("g")
            .attr("class", "legend-element")
            .attr("transform", (d, i, nodes) => {
                const legendElementHeight = 16;
                const legendElementGap = 1;
                const startY = height - 30;
                const startX = width - 30;
                const offset = nodes.length - i - 1;
                const coordX = startX;
                const coordY = startY - (offset * (legendElementHeight + legendElementGap));
                return `translate(${coordX},${coordY})`;
            })
            .call(g => g.append("rect")
                .attr("width", 16)
                .attr("height", 16)
                .attr("fill", d => d[1].color))
            .call(g => g.append("text")
                .attr("class", "legend-labels")
                .attr("x", -4)
                .attr("y", 9)
                .attr("dy", "0")
                .attr("font-size", FONT_SIZE)
                .attr("text-anchor", "end")
                .style("dominant-baseline", "middle")
                .text(d => d[0]));
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