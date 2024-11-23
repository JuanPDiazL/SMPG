"use strict";

function drawMap(layer) {
    const layerArea = d3.geoArea(layer);
    const layerBounds = d3.geoBounds(layer);

    let fieldId = parameters["target_id_field"];
    const FONT_SIZE = 13;
    let divElement = $("#mapRoot");
    let width = 800;
    let height = 800;

    const projection = d3.geoMercator()
    .fitSize([width, height], layer); // Fit the map to the SVG viewport size
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

    // draw selection bounding box rectangle
    const mapSelectorPath = svg.select("#mapSelector").append("path")
        .attr("class","selection-path")
        // .attr("filter", "url(#shadow)")
        .style("fill", "none")
        .style("stroke", "red")
        .style("stroke-width", 4)
        .style("stroke-linejoin", "round")
        .style("pointer-events", "none")

    // Draw the map
    svg.select("#mapPolygons").selectAll(".country")
        .data(layer.features)
        .enter().append("path")
        .attr("class", d => `country country-${d.properties[fieldId]} w3-ripple`)
        .attr("d", d3.geoPath().projection(projection))
        .style("fill", d => `lightgray`) // Color for the polygons
        .style("stroke", "black")
        .style("stroke-width", .5)
        // .style("stroke-dasharray", "8,4")
        .style("stroke-linecap", "round")
        .on("mouseover", (event, d) => {
            mapSelectorPath
            .attr("d", d3.geoPath().projection(projection)(d))
            .style("display", null)
        })
        .on("mouseout", (event, d) => {
            mapSelectorPath
            .style("display", "none")
        })
        .on("click", (event, d) => {
            navigateTo({"place": d.properties[fieldId], "mode": "plots"});
        })

    // draw labels
    svg.select("#mapLabels").selectAll(".map-text-label")
        .data(layer.features)
        .enter().append("text")
        .text(d => d.properties[fieldId])
        .attr("class", "map-text-label")
        .attr("transform", d => `translate(${projection(d3.geoCentroid(d))})`)
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", FONT_SIZE)
        .style("pointer-events", "none")
        .style("display", d => {
            const areaRatio = d3.geoArea(d) / layerArea;
            const xRatio = (d.bbox[2] - d.bbox[0]) / (layerBounds[1][0] - layerBounds[0][0]);
            return areaRatio > 0.004 && xRatio > 0.08 ? null : "none"
        })
        .style("paint-order", "stroke")
        .style("fill", "black")
        .style("stroke", "#fff8")
        .style("stroke-width", 3)
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")

    svg
    .attr("width", null)
    .attr("height", null)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `0, 0, ${width}, ${height}`)
}