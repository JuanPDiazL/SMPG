"use strict";

function drawMap(geoJson) {
    const layerArea = d3.geoArea(geoJson);
    const layerBounds = d3.geoBounds(geoJson);

    const FONT_SIZE = 13;
    let divElement = $("#mapRoot");
    let width = 800;
    let height = 800;

    let mapStats = {
        '': () => undefined,
        'C. Dk./LTA Pct.': (col) => selected_seasons_general_stats[col]['C. Dk./LTA Pct.'],
        'Ensemble Med./LTA Pct.': (col) => selected_seasons_general_stats[col]['Ensemble Med./LTA Pct.'],
        'Probability Below Normal': (col) => selected_seasons_general_stats[col]['E. Prob. Below Normal Pct.'],
        'Probability Between Normal': (col) => selected_seasons_general_stats[col]['E. Prob. Between Normal Pct.'],
        'Probability Above Normal': (col) => selected_seasons_general_stats[col]['E. Prob. Above Normal Pct.'],
        'Ensemble Med. Pctl.': (col) => selected_seasons_general_stats[col]['Ensemble Med. Pctl.'],
        'Current Season Pctl.': (col) => place_general_stats[col]['Current Season Pctl.'],
    }

    const projection = d3.geoMercator()
    .fitSize([width, height], geoJson); // Fit the map to the SVG viewport size
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

    // draw selection bounding box rectangle
    const mapSelectorPath = svg.select("#mapSelector").selectAll(".selection-path")
        .data([null])
        .enter()
        .append("path")
        .attr("class","selection-path")
        // .attr("filter", "url(#shadow)")

    // Draw the map
    const polygons = svg.select("#mapPolygons").selectAll(".country")
        .data(geoJson.features)
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
            navigateTo({"place": d.properties[fieldId], "mode": "plots"});
        })

    // draw labels
    const labels = svg.select("#mapLabels").selectAll(".map-text-label")
        .data(geoJson.features)
        .enter().append("text")
        .text(d => d.properties[fieldId])
        .attr("class", "map-text-label")
        .attr("transform", d => `translate(${projection(d3.geoCentroid(d))})`)
        .attr("font-size", FONT_SIZE)
        .style("dominant-baseline", "middle")
        .style("display", d => {
            const areaRatio = d3.geoArea(d) / layerArea;
            const xRatio = (d.bbox[2] - d.bbox[0]) / (layerBounds[1][0] - layerBounds[0][0]);
            return areaRatio > 0.004 && xRatio > 0.08 ? null : "none"
        })

    const legendContainer = d3.select("#mapLegend");

    svg
    .attr("width", null)
    .attr("height", null)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `0, 0, ${width}, ${height}`)
    selectNode.addEventListener("change", function() {
        const displayId = this.value;
        // Update label text based on the selected property
        labels.text(d => d.properties[displayId]);
    });
    legendCbNode.addEventListener("change", function() {
        const showLegend = this.checked;
        legendContainer.style("display", showLegend? null : "none");
    });
    colorNode.addEventListener("change", function() {
        const selectedStatId = this.value;
        const selectedStats = mapStats[selectedStatId];
        const selectedBins = categories[selectedStatId];
        // Update legend based on the selected property
        const legend = Legend(d3.scaleOrdinal(Object.keys(selectedBins), Object.values(selectedBins).map(bin => bin.color)), {
            title: "Legend",
            tickSize: 0,
            width: 600,
        });
        legendContainer.html(selectedStatId !== ""? legend.outerHTML : "");
        // Update polygon color based on the selected property
        polygons.style("fill", d => {
            const value = selectedStats(d.properties[fieldId]);
            const category = categorizeValue(value, selectedBins);
            return selectedBins[category]["color"];
        });
    });
}