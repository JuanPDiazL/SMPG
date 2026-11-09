// This file contains the classes and code to construct the widgets that
// contain the plots, maps, and other type of data

// The radius of the scatter series' points (billboard.js's default) and of a marker's point (see
// BBPlot.getPointRadius())
const BB_POINT_RADIUS = 2.5;
const BB_MARKER_RADIUS = 5;
// How long a chart's load can take before the next one runs anyway (see BBPlot.update()), in ms
const BB_LOAD_TIMEOUT = 5000;
// How long a chart's resize can take before the next load runs anyway (see BBPlot.resize()), in
// ms; billboard.js ends a resize 200 ms after it starts
const BB_RESIZE_TIMEOUT = 3000;

class BBPlot {
    constructor(containerElement, dataGetter, xNames, xsDefinition, 
        xsDataRelation, chartTypes, 
        gridLinesGetter = null, 
        customSettings = {}) {
        this.containerElement = containerElement;
        this.dataGetter = dataGetter;
        this.xNames = xNames;
        this.xsDefinition = xsDefinition;
        this.xsDataRelation = xsDataRelation;
        this.chartTypes = chartTypes;
        this.gridLinesGetter = gridLinesGetter ?? (() => []);
        this.customSettings = customSettings;
        // Called when the plot area may have moved, see onChartAreaChange()
        this.chartAreaListener = null;
        // Optional: returns {seriesName: [className, ...]} for the data of a place, added to the
        // series' classes from chartClasses (see update())
        this.seriesClassesGetter = null;
        // One load or resize at a time (see update() and resize()): the load and the resize
        // running, and the place and the resize waiting
        this.runningLoad = null;
        this.runningResize = null;
        this.pendingUpdate = null;
        this.pendingResize = false;
        // The markers toggled on from the table (see toggleMarker()), as "<series>@<at>" keys, and
        // the function that gives a marker's data index from its "at" (null: no marker there)
        this.activeMarkers = new Set();
        this.markerIndexGetter = null;
        // A marker toggled during a load or a resize, drawn when it ends (see redrawMarkers())
        this.pendingMarkerRedraw = false;

        this.allContainer = this.containerElement.append("div")
            .attr("class", "plot-context-container");

        const chartContainer = this.allContainer.append("div")
            .attr("class", "plot-chart-container w3-container w3-padding-small");
        const legendContainer = this.allContainer.append("div")
            .attr("class", "plot-legend-container w3-container w3-padding-small");
        
        
        const chartOptions = {
            axis: {
                x: {
                    tick: {
                        format: (index) => this.xNames[index]
                    },
                },
            },
            legend: {
                contents: {
                    bindto: legendContainer.node(),
                    // Each series' symbol (a bar for a bar series), from this plot's series types
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
            // Only the markers' points are drawn on lines (the others have no radius), with their
            // values as labels; billboard.js reads both on every redraw (see toggleMarker())
            point: {
                r: (d) => this.getPointRadius(d),
            },
            data: {
                labels: {
                    format: (value, id, index) => this.isMarkerAt(id, index) ? String(Math.round(value)) : "",
                    position: (type, value, id, index) => this.getMarkerLabelOffset(type, id, index),
                },
            },
            // New data can change the axes' widths, so where the plot area starts; and the
            // markers are put above the lines (see raiseMarkers())
            onrendered: () => {
                this.raiseMarkers();
                this.chartAreaListener?.();
            },
            // The end of a resize (see resize())
            onresized: () => this.endResize(this.runningResize),
        };
        this.plot = bb.generate(
            _.merge(
                {
                    bindto: chartContainer.node(),
                    data: { json: {}, },
                }, 
                globalBBChartDefaultOptions, 
                chartOptions, 
                this.customSettings,
            )
        );
        // The chart is resized by scaling its viewBox, without rendering again
        this.resizeObserver = new ResizeObserver(() => this.chartAreaListener?.());
        this.resizeObserver.observe(chartContainer.node());

        // A click on a year's line or bar makes it the year in view, or none if it already is
        // (see getYearAtPointer()); the pointer is a hand over them
        this.lineSamples = new WeakMap();
        chartContainer.on("click.yearInView", (event) => {
            const year = this.getYearAtPointer(event);
            if (year !== null) {
                setYearInView(year === yearInView ? null : year);
            }
        });
        chartContainer.on("mousemove.yearInView", (event) => {
            chartContainer.classed("plot-year-hover", this.getYearAtPointer(event) !== null);
        });
        chartContainer.on("mouseleave.yearInView", () => chartContainer.classed("plot-year-hover", false));
    }

    /**
     * Returns the year under the pointer: a bar whose x label is a year (e.g. a percentiles bar),
     * or the nearest line of a series named after a year, within 12 screen pixels. Series hidden
     * from the legend don't count. It works from the drawn shapes, so it doesn't need the lines'
     * points to be shown.
     * @param {MouseEvent} event - A pointer event on the chart.
     * @returns {string|null} One of datasetProperties.year_ids, or null.
     */
    getYearAtPointer(event) {
        const years = datasetProperties.year_ids;
        const shown = new Set(this.plot.data.shown().map((series) => series.id));
        const chart = this.allContainer.node();
        // the pointer in an element's own coordinates
        const toLocal = (element) => new DOMPoint(event.clientX, event.clientY)
            .matrixTransform(element.getScreenCTM().inverse());

        for (const bar of chart.querySelectorAll("path.bb-bar")) {
            const datum = d3.select(bar).datum();
            const year = this.xNames[datum?.x];
            if (datum && shown.has(datum.id) && years.includes(year) && bar.isPointInFill(toLocal(bar))) {
                return year;
            }
        }

        let nearestYear = null;
        let nearestDistance = Infinity;
        for (const line of chart.querySelectorAll("path.bb-line")) {
            const id = d3.select(line).datum()?.id;
            if (!years.includes(id) || !shown.has(id)) { continue; }
            // 12 screen pixels in the line's own units (the chart is scaled with its viewBox)
            const matrix = line.getScreenCTM();
            const scale = Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c));
            const pointer = toLocal(line);
            const points = this.getLineSamples(line, 4 / scale);
            // distance to the segments between the samples, so the samples' spacing doesn't count
            for (let i = 1; i < points.length; i++) {
                const distance = distanceToSegment(pointer, points[i - 1], points[i]) * scale;
                if (distance <= 12 && distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestYear = id;
                }
            }
        }
        return nearestYear;
    }

    /**
     * Returns points along a drawn line, kept until the line changes shape.
     * @param {SVGPathElement} line - A series' line.
     * @param {number} step - The distance between points, in the line's own units.
     * @returns {DOMPoint[]} The points.
     */
    getLineSamples(line, step) {
        const shape = line.getAttribute("d");
        const cached = this.lineSamples.get(line);
        if (cached && cached.shape === shape && cached.step === step) { return cached.points; }
        const length = line.getTotalLength();
        const points = [];
        for (let distance = 0; distance < length; distance += step) {
            points.push(line.getPointAtLength(distance));
        }
        points.push(line.getPointAtLength(length));
        this.lineSamples.set(line, { shape, step, points });
        return points;
    }

    /**
     * Returns the plot area's top-left corner (the origin of its g.bb-chart; its bounding box only
     * covers what is drawn) in the window.
     * @returns {DOMPoint|null} null while the chart isn't shown.
     */
    getChartAreaOrigin() {
        const chartArea = this.allContainer.node().querySelector(".bb-chart");
        const matrix = chartArea?.getScreenCTM();
        return matrix ? new DOMPoint(0, 0).matrixTransform(matrix) : null;
    }

    /**
     * Sets the function called when the plot area may have moved: after rendering, and when the
     * chart's size changes.
     * @param {Function} listener
     */
    onChartAreaChange(listener) {
        this.chartAreaListener = listener;
    }

    /**
     * Loads a place's data. billboard.js applies a load's settings (its xs, classes and colors) at
     * once, but loads its data later (after an idle callback, to unload the previous data first),
     * so overlapping loads mix one load's settings with another's data: bars without data (a
     * "can't access property 'value'" error in redrawBar) or an earlier place's series left on the
     * chart. So one load runs at a time: an update during a load waits for it, and only the latest
     * one waiting is loaded. A redraw before the data arrives breaks the chart too, and data drawn
     * during a resize loses its dots (see resize()), so an update also waits for a resize.
     * @param {string} index - The place.
     */
    update(index) {
        if (this.runningLoad || this.runningResize) {
            this.pendingUpdate = { index };
            return;
        }
        const data = this.dataGetter(index);
        // NaN/null only series are removed from the data
        for (const id of Object.keys(data)) {
            if (Array.isArray(data[id]) && data[id].every(value => value === null || Number.isNaN(value))) {
                delete data[id];
            }
        }
        const dataIds = Object.keys(data);
        // Add xs entries per series
        const xs = Object.fromEntries(dataIds.map(id => {
                return [id, (id in this.xsDataRelation)
                    ? this.xsDataRelation[id] : "default_xs"];
            }));
        const usedXs = new Set(Object.values(xs));
        // filter out unused xs entries
        const xsDefinition = Object.fromEntries(
            Object.entries(this.xsDefinition).filter(([name]) => usedXs.has(name)));
        const jsonData = {
            ...xsDefinition,
            ...data,
        };
        const load = { index };
        // A load that never ends (e.g. an error inside billboard.js) doesn't block the next ones
        load.timeout = setTimeout(() => this.endLoad(load), BB_LOAD_TIMEOUT);
        this.runningLoad = load;
        this.plot.load({
            json: jsonData,
            xs: xs,
            types: this.chartTypes,
            classes: this.getSeriesClasses(index, dataIds),
            // each series' color is the same in every chart (see getPlotColor())
            colors: Object.fromEntries(dataIds.map((id) => [id, getPlotColor(id)])),
            unload: true,
            // The legend is drawn with the data, so the chart is sized again once it's there
            resizeAfter: true,
            done: () => this.endLoad(load),
        });
    }

    /**
     * Ends a load (see update()): draws its grid lines, with its data, then runs the resize
     * waiting, if any, and the update waiting, if any, after it.
     * @param {Object} load - The load, {index, timeout}; another than the one running is ignored.
     */
    endLoad(load) {
        if (load !== this.runningLoad) { return; }
        clearTimeout(load.timeout);
        this.runningLoad = null;
        if (this.destroyed) { return; }
        this.plot.xgrids(this.gridLinesGetter(load.index));
        // the load's redraw drew the markers
        this.pendingMarkerRedraw = false;
        if (this.pendingResize) {
            this.pendingResize = false;
            this.resize();
        }
        this.runPendingUpdate();
    }

    /**
     * Loads the update waiting, if any, unless a load or a resize is running (it then waits for
     * their end).
     */
    runPendingUpdate() {
        if (this.runningLoad || this.runningResize || this.destroyed) { return; }
        const pending = this.pendingUpdate;
        this.pendingUpdate = null;
        if (pending) {
            this.update(pending.index);
        }
    }

    /**
     * Returns the loaded series' classes for billboard.js: their classes from chartClasses and
     * from seriesClassesGetter, and year-in-view for the year in view. billboard.js prefixes a
     * series' class with bb-target- and takes
     * one, so several are joined with that prefix ("line-thick bb-target-line-dashed").
     * @param {string} index - The place.
     * @param {string[]} dataIds - The loaded series' names.
     * @returns {Object} {seriesName: classes}.
     */
    getSeriesClasses(index, dataIds) {
        const extraClasses = this.seriesClassesGetter?.(index) ?? {};
        const classes = {};
        for (const id of dataIds) {
            const list = [...(chartClasses[id] ?? []), ...(extraClasses[id] ?? [])];
            // the year in view is highlighted in every chart (see plots.css)
            if (id === yearInView) {
                list.push("year-in-view");
            }
            // every series gets a value, "" for none: billboard.js keeps a series' classes from
            // one load to the next, e.g. the previous year in view's
            classes[id] = [...new Set(list)].join(" bb-target-");
        }
        return classes;
    }

    /**
     * Resizes the chart to its container. During a load it waits for the load's end: a redraw
     * after billboard.js unloaded the previous data but before the new data arrives leaves bars
     * and lines without data ("can't access property 'value'" or "'id'" errors when the data is
     * drawn). A resize runs until billboard.js calls onresized (200 ms later, see endResize());
     * until then billboard.js doesn't draw dots, so data loaded meanwhile would have none: the
     * next update waits for it.
     * @param {Array} [size] - Unused; the chart takes its container's size.
     */
    resize(size) {
        if (this.runningLoad) {
            this.pendingResize = true;
            return;
        }
        // a resize during another one restarts it (billboard.js restarts its timer too)
        clearTimeout(this.runningResize?.timeout);
        const resize = {};
        // a resize that never ends (e.g. a chart not drawn yet) doesn't block the next loads
        resize.timeout = setTimeout(() => this.endResize(resize), BB_RESIZE_TIMEOUT);
        this.runningResize = resize;
        this.plot.resize();
    }

    /**
     * Ends a resize (see resize()) and loads the update waiting, if any.
     * @param {Object|null} resize - The resize; another than the one running (or none, when
     *     billboard.js ends a resize of its own) is ignored.
     */
    endResize(resize) {
        if (!resize || resize !== this.runningResize) { return; }
        clearTimeout(resize.timeout);
        this.runningResize = null;
        // billboard.js clears its resizing state right after calling onresized
        setTimeout(() => {
            if (this.pendingMarkerRedraw) { this.redrawMarkers(); }
            this.runPendingUpdate();
        }, 0);
    }

    /**
     * Turns a marker, a point of a series (see tableActions), on or off. They're kept while the
     * place changes.
     * @param {Object} marker - {series, at}.
     * @returns {boolean} Whether it's now on.
     */
    toggleMarker(marker) {
        const key = `${marker.series}@${marker.at}`;
        if (!this.activeMarkers.delete(key)) {
            this.activeMarkers.add(key);
        }
        this.redrawMarkers();
        return this.activeMarkers.has(key);
    }

    /**
     * Draws the markers again: a redraw, which reads the labels' format, then the line points'
     * radius (billboard.js reads getPointRadius() only when it creates a point, i.e. on a load).
     * A load or a resize running draws them when it ends: a redraw during a load breaks the chart,
     * and during a resize billboard.js doesn't draw points (see update() and resize()).
     */
    redrawMarkers() {
        if (this.runningLoad || this.runningResize) {
            this.pendingMarkerRedraw = true;
            return;
        }
        this.pendingMarkerRedraw = false;
        this.plot.flush();
        d3.select(this.allContainer.node()).selectAll(".bb-chart-lines .bb-circle")
            .attr("r", (d) => this.getPointRadius(d));
        this.raiseMarkers();
    }

    /**
     * Puts the markers above every line and grid line, after each redraw: billboard.js draws the
     * labels first (under the lines), each point in its own line's group (under the lines drawn
     * after it), and the grid lines after the chart. The points are drawn again in a layer of their
     * own, over the originals (billboard.js keeps those: moving them would break its updates); that
     * layer and the labels' layer go right after the grid lines, under the axes, clipped like the
     * chart. The copies are grouped by series, and each group follows its line's focus and hiding
     * (see syncMarkerSeries()).
     */
    raiseMarkers() {
        const chart = d3.select(this.allContainer.node()).select(".bb-chart");
        if (chart.empty()) { return; }
        const series = [...chart.node().querySelectorAll(".bb-chart-lines .bb-chart-line")]
            .map((line) => ({
                line,
                points: [...line.querySelectorAll(".bb-circle")]
                    .filter((point) => +point.getAttribute("r") > 0)
                    .map((point) => ({ cx: point.getAttribute("cx"), cy: point.getAttribute("cy"), color: point.style.fill })),
            }))
            .filter((entry) => entry.points.length > 0);
        const main = d3.select(chart.node().parentNode);
        let layer = main.select(".marker-points");
        if (layer.empty()) {
            layer = main.append("g").attr("class", "marker-points");
        }
        layer.selectAll("g")
            .data(series)
            .join("g")
                .attr("class", "marker-series")
            .selectAll("circle")
            .data((entry) => entry.points)
            .join("circle")
                .attr("cx", (d) => d.cx)
                .attr("cy", (d) => d.cy)
                .attr("r", BB_MARKER_RADIUS)
                .style("fill", (d) => d.color);
        this.syncMarkerSeries();
        // billboard.js focuses and hides a series by changing its line's group, without a redraw
        const lines = chart.select(".bb-chart-lines").node();
        if (lines && this.observedLines !== lines) {
            this.markerSeriesObserver?.disconnect();
            this.markerSeriesObserver = new MutationObserver(() => this.syncMarkerSeries());
            this.markerSeriesObserver.observe(lines, { subtree: true, attributes: true, attributeFilter: ["class", "style"] });
            this.observedLines = lines;
        }
        const texts = main.select(".bb-chart-texts");
        let previous = main.select(".bb-grid-lines").node() ?? chart.node();
        for (const group of [layer, texts]) {
            if (group.empty()) { continue; }
            group.attr("clip-path", chart.attr("clip-path"));
            previous.after(group.node());
            previous = group.node();
        }
        this.separateMarkerLabels();
    }

    /**
     * Gives each series' copied markers (see raiseMarkers()) its line's focus (billboard.js's
     * bb-focused and bb-defocused classes) and hiding (its inline opacity and display).
     */
    syncMarkerSeries() {
        d3.select(this.allContainer.node()).selectAll(".marker-points .marker-series")
            .classed("bb-focused", (entry) => entry.line.classList.contains("bb-focused"))
            .classed("bb-defocused", (entry) => entry.line.classList.contains("bb-defocused"))
            .style("opacity", (entry) => entry.line.style.opacity || null)
            .style("display", (entry) => entry.line.style.display || null);
    }

    /**
     * Returns a marker label's offset from its point (data.labels.position), by the markers'
     * values at the same period: the highest's label above, the lowest's below, and between them
     * to the right; so a label is next to its own point when the lines are close or cross.
     * @param {string} type - "x" or "y".
     * @param {string} id - The series.
     * @param {number} index - The point's index in the series' data.
     * @returns {number}
     */
    getMarkerLabelOffset(type, id, index) {
        if (!this.isMarkerAt(id, index)) { return 0; }
        // by x, not index: a series with its own xs (the forecast) starts at another period
        const x = this.plot.data(id)[0]?.values[index]?.x;
        const markers = this.getMarkerPoints()
            .filter((point) => point.x === x)
            .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
            .map((point) => point.id);
        const rank = markers.indexOf(id);
        const offset = rank === 0 ? { x: -18, y: -4 }
            : rank === markers.length - 1 ? { x: -18, y: 24 }
            : { x: 22, y: 10 };
        return offset[type];
    }

    /**
     * Keeps the markers' labels apart: from the top, a label overlapping the one above it is moved
     * down below it. billboard.js places them again on each redraw (from their offsets in
     * data.labels.position), then this runs (onrendered).
     */
    separateMarkerLabels() {
        const labels = [...this.allContainer.node().querySelectorAll(".bb-chart-texts .bb-text")]
            .filter((label) => label.textContent)
            .map((label) => ({ label, box: label.getBBox() }))
            .sort((a, b) => a.box.y - b.box.y);
        for (let i = 1; i < labels.length; i++) {
            const { label, box } = labels[i];
            for (const above of labels.slice(0, i)) {
                const overlapsX = box.x < above.box.x + above.box.width && above.box.x < box.x + box.width;
                const shift = above.box.y + above.box.height - box.y;
                if (overlapsX && shift > 0) {
                    label.setAttribute("y", +label.getAttribute("y") + shift);
                    box.y += shift;
                }
            }
        }
    }

    /**
     * Returns the toggled-on markers' points.
     * @returns {Array<Object>} {id, x, value} each.
     */
    getMarkerPoints() {
        const points = [];
        for (const key of this.activeMarkers) {
            const separator = key.lastIndexOf("@");
            const id = key.slice(0, separator);
            const index = this.markerIndexGetter?.(key.slice(separator + 1));
            const point = index === null || index === undefined ? null : this.plot.data(id)[0]?.values[index];
            if (point && point.value !== null) { points.push({ id, x: point.x, value: point.value }); }
        }
        return points;
    }

    /**
     * Whether a series' data point is a marker toggled on (see toggleMarker()).
     * @param {string} id - The series.
     * @param {number} index - The point's index in the series' data.
     * @returns {boolean}
     */
    isMarkerAt(id, index) {
        if (!this.markerIndexGetter) { return false; }
        for (const key of this.activeMarkers) {
            const at = key.slice(key.lastIndexOf("@") + 1);
            if (key === `${id}@${at}` && this.markerIndexGetter(at) === index) { return true; }
        }
        return false;
    }

    /**
     * Returns a point's radius: the scatter series' points keep billboard.js's size, a marker's
     * point is larger, and the other line points have none (they aren't shown).
     * @param {Object} d - The point, {id, index, value, x}.
     * @returns {number}
     */
    getPointRadius(d) {
        if (this.chartTypes[d.id] === "scatter") { return BB_POINT_RADIUS; }
        return this.isMarkerAt(d.id, d.index) ? BB_MARKER_RADIUS : 0;
    }

    /**
     * Whether a marker is on (see toggleMarker()).
     * @param {Object} marker - {series, at}.
     * @returns {boolean}
     */
    isMarkerActive(marker) {
        return this.activeMarkers.has(`${marker.series}@${marker.at}`);
    }

    destroy() {
        this.destroyed = true;
        clearTimeout(this.runningLoad?.timeout);
        clearTimeout(this.runningResize?.timeout);
        this.pendingUpdate = null;
        this.resizeObserver.disconnect();
        this.plot.destroy();
    }

    getProperties() {
        return {

        }
    }

    setProperties(properties) {

    }
}

// The table cell actions (see tableActions in bbPlotUtils.js), by name: run() does it, isActive()
// tells whether it's on, for the cell's pressed state. Each receives the card and the cell's entry.
const TABLE_ACTIONS = {
    'toggle-marker': {
        run: (card, marker) => card.cardElements.plot.toggleMarker(marker),
        isActive: (card, marker) => card.cardElements.plot.isMarkerActive(marker),
    },
};

class Table {
    constructor(containerElement, dataGetter) {
        this.containerElement = containerElement;
        this.dataGetter = dataGetter;
        // Set by the card (see chartCard.changePlot()): its card type's tableActions, and the
        // functions that run a cell's action and tell whether it's on; none, no cell has actions
        this.actions = null;
        this.onCellAction = null;
        this.isCellActive = null;

        this.tableContainer = this.containerElement
            .append("div")
            .attr("class", "chart-table-container w3-hide");
        this.tableCollection = null;
    }

    /**
     * Places the table's top-left corner at a point, e.g. its plot's top-left corner.
     * @param {DOMPoint|null} point - The point in the window; null leaves the table where it is.
     */
    alignTo(point) {
        if (!point) { return; }
        // The table is placed against the card body (also while it's hidden)
        const body = this.containerElement.node();
        const box = body.getBoundingClientRect();
        this.tableContainer
            .style("left", `${point.x - box.left - body.clientLeft + body.scrollLeft}px`)
            .style("top", `${point.y - box.top - body.clientTop + body.scrollTop}px`);
    }

    update(index) {
        const data = this.dataGetter(index);
        this.tableContainer.selectAll("table").remove();
        this.tableCollection = this.tableContainer
        .selectAll("table")
            .data(Object.keys(data))
            .join("table")
                .attr("class", "chart-table w3-table w3-bordered w3-border")
                .call(table => {
                    table.append("thead")
                    .append("th")
                    .classed("w3-hide", d => d === "[hide header]")
                    .attr("colspan", d => data[d][0].length)
                        .text(d => d);
            
                    // each cell with its color and action, from its row and column (see
                    // tableColors and tableActions); a cell with an action is a button
                    table.append("tbody").selectAll("tr")
                        .data(d => data[d].map(row => ({ row, headerRow: data[d].find(r => r[0] === null) })))
                        .join("tr").selectAll("td")
                            .data(({ row, headerRow }) => row.map((value, column) => ({ value,
                                color: getTableCellColor(row, column, headerRow),
                                action: getTableCellAction(this.actions, row, column, headerRow) })))
                            .join("td")
                                .classed("table-colored", d => d.color !== null)
                                .style("--table-color", d => d.color)
                                .classed("table-action", d => d.action !== null)
                                .attr("role", d => d.action ? "button" : null)
                                .attr("tabindex", d => d.action ? 0 : null)
                                .attr("aria-pressed", d => d.action ? String(!!this.isCellActive?.(d.action)) : null)
                                .on("click", (event, d) => this.runCellAction(event, d))
                                .on("keydown", (event, d) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        this.runCellAction(event, d);
                                    }
                                })
                                .call(td => {
                                    td.text(({ value: d }) => {
                                            if (typeof d === 'number' && !isNaN(d)) {
                                                return d.toFixed(0);
                                            } else if (d === null) {
                                                return '';
                                            } else {
                                                return d;
                                            }
                                        });
                                })
            });
    }

    /**
     * Runs a cell's action, if it has one, and shows whether it's now on.
     * @param {Event} event - The click or key press on the cell.
     * @param {Object} cell - The cell's data, {value, color, action}.
     */
    runCellAction(event, cell) {
        if (!cell.action) { return; }
        event.preventDefault();
        event.stopPropagation();
        this.onCellAction?.(cell.action);
        d3.select(event.currentTarget).attr("aria-pressed", String(!!this.isCellActive?.(cell.action)));
    }

    getProperties() {
        return {
            tableShown: !this.tableContainer.classed("w3-hide"),
        }
    }

    setProperties(properties) {
        if ("tableShown" in properties) {
            this.tableContainer.classed("w3-hide", !properties.tableShown);
        }
    }
}

class chartCard {
    /**
     * @param {string} containerSelector - CSS selector for the element to build the card into.
     * @param {Object} smpgOpts - Initial properties, in the same shape as getProperties()/setProperties()
     *   (e.g. {smpgCardType: "Map", map: {legend_stat: "Average Total"}}). Only smpgCardType is
     *   required; the rest is applied via setProperties() once the card is built. showHeader
     *   (default true) false hides the header in reader mode. help is one of helpTexts.js's
     *   HELP_TEXTS ids, opened by the card's help button. A type this
     *   report doesn't offer builds an "Empty Widget", see invalidCardType.
     */
    constructor(containerSelector, smpgOpts = {}) {
        this.cardTypes = {
            "Empty Widget": {
                "full title": "Empty Widget",
                "cardElementsBuilder": () => {return {}},
            },
            "Seasonal Accumulations": {
                "full title": "Seasonal Accumulations",
                "cardElementsBuilder": makeAccumulationsCard,
            }, 
            "Current Year Status": {
                "full title": `${ignoreCurrentSeason ? "" : `Current Year Status: ${datasetProperties.current_season_id}.`} Climatology: [${datasetProperties.climatology_year_ids[0]}, ${getLast(datasetProperties.climatology_year_ids)}]`,
                "cardElementsBuilder": makeCurrentYearCard,
            }, 
            "Ensemble": {
                "full title": "Ensemble",
                "cardElementsBuilder": makeEnsembleCard,
            },
            "Seasonal Accumulation Percentiles": {
                "full title": "Seasonal Accumulation Percentiles",
                "cardElementsBuilder": makeAccumulationPercentilesCard,
            },
        };
        if (hasForecast) {
            this.cardTypes["Ensemble with Forecast"] = {
                "full title": "Ensemble with Forecast",
                "cardElementsBuilder": makeEnsembleWithForecastCard,
            };
            this.cardTypes["Seasonal Accumulation Percentiles with Forecast"] = {
                "full title": "Seasonal Accumulation Percentiles with Forecast",
                "cardElementsBuilder": makeForecastAccumulationPercentilesCard,
            };
        }
        if (hasMap) {
            this.cardTypes["Map"] = {
                "full title": "Map",
                "cardElementsBuilder": makeMapCard,
            };
        }
        this.cardTypes["Rich Text"] = {
            "full title": "Rich Text",
            "cardElementsBuilder": makeTextEditorCard,
        };
        // an unavailable type is recorded in invalidCardType by setProperties() below
        this.cardType = this.isAvailableCardType(smpgOpts.smpgCardType) ? smpgOpts.smpgCardType : "Empty Widget";
        this.invalidCardType = null;
        // false: no header in reader mode (a left border instead), a striped header in edit mode
        this.showHeader = smpgOpts.showHeader !== false;
        // The header's title instead of the type's, while the card keeps its type (smpgOpts.title,
        // applied by setProperties())
        this.customTitle = null;
        // The help opened by the help button, one of HELP_TEXTS' ids, or null for no button
        // (smpgOpts.help, applied by setProperties())
        this.helpId = null;

        this.elementContainer = d3.select(containerSelector);
        this.cardContainer = this.elementContainer
            .append("div")
            .attr("class", "plot-card");

        this.cardHeader = this.cardContainer
            .append("header")
            .attr("class", "card-header w3-blue-grey");
        this.cardButtonGroup = this.cardHeader.append("div")
            .attr("class", "card-button-group");
        this.graphTypeSelectContainer = this.cardHeader
            .append("div")
            .attr("class", "card-title-select w3-dropdown-click")
            .on("click.openDropDownMenu", (event) => {
                // Widget types are only changed in edit mode
                if (!reportEditMode) { return; }
                const graphTypeSelectContent = this.graphTypeSelectContent;
                graphTypeSelectContent
                    .classed("w3-show", !graphTypeSelectContent.classed("w3-show"));
            });
        this.graphTypeSelectOpenButton = this.graphTypeSelectContainer
            .append("span")
            .attr("class", "card-title-select-button");
        this.graphTypeSelectContent = this.cardHeader
            .append("div")
            .attr("class", "w3-dropdown-content w3-bar-block w3-border");
        this.graphTypeSelectContent.selectAll("button").data(Object.keys(this.cardTypes))
            .join("button")
                .attr("class", "card-title-select-button w3-bar-item w3-button")
                .attr("value", d => d)
                .text(d => d)
            .on("click.selectCardType", (event) => {
                const graphTypeSelectContent = this.graphTypeSelectContent;
                graphTypeSelectContent.classed("w3-show", false);
                const selectedCardType = event.target.value;
                this.changePlot(selectedCardType);
            });

        this.cardBody = this.cardContainer
            .append("div")
            .attr("class", "card-body w3-container");
        
        this.cardElements = {};
        this.changePlot(this.cardType);
        this.setProperties(smpgOpts);
        this.refreshHeaderDisplay();
    }

    changePlot(cardType) {
        // A custom title and a help belong to the type they were given for
        if (cardType !== this.cardType) {
            this.customTitle = null;
            this.helpId = null;
        }
        this.cardType = cardType;
        this.destroy();
        this.cardBody.selectChildren().remove();

        
        this.cardButtonGroup.selectChildren().remove();
        this.closeButton = this.cardButtonGroup.append("span").append("button")
            .attr("class", "card-button card-edit-button mi w3-button w3-ripple w3-right capture-ignore")
            .attr("title", "Close Card (discarded)")
            .text("close")
            .on("click", (event) => {
                closeWidget(this.elementContainer.node().parentElement.getAttribute("gs-id"));
            });
        this.unloadButton = this.cardButtonGroup.append("span").append("button")
            .attr("class", "card-button card-edit-button mi w3-button w3-ripple w3-right capture-ignore")
            .attr("title", "Unload Card (saved in the layout)")
            .text("archive")
            .on("click", (event) => {
                unloadWidget(this.elementContainer.node().parentElement.getAttribute("gs-id"));
            });

        // Rightmost of the buttons shown outside layout editing
        this.maximizeButton = this.cardButtonGroup.append("span").append("button")
            .attr("class", "card-button mi w3-button w3-ripple w3-right capture-ignore")
            .on("click", () => this.toggleMaximize());
        this.refreshMaximizeButton();

        // Also shown by a hidden header in reader mode (see widgetCard.css)
        this.helpButton = this.cardButtonGroup.append("span").append("button")
            .attr("class", "card-button mi w3-button w3-ripple w3-right capture-ignore show-on-hidden-header")
            .attr("title", "Help: what this window shows")
            .text("help_outline")
            .on("click", () => openHelp(this.helpId));
        this.refreshHelpButton();

        this.headerDisplayButton = this.cardButtonGroup.append("span").append("button")
            .attr("class", `card-button mi w3-button w3-ripple w3-right capture-ignore ${REPORT_EDIT_ONLY_CLASS}`)
            .on("click", (event) => {
                this.changeHeaderDisplay(!this.showHeader);
            });
        this.refreshHeaderDisplay();

        this.renameButton = this.cardButtonGroup.append("span").append("button")
            .attr("class", `card-button mi w3-button w3-ripple w3-right capture-ignore ${REPORT_EDIT_ONLY_CLASS}`)
            .attr("title", "Rename window")
            .text("drive_file_rename_outline")
            .on("click", () => openRenameDialog(this));

        if (this.cardType == "Disabled") {
            this.cardElements = {}
            return;
        }

        this.cardElements = this.cardTypes[this.cardType]["cardElementsBuilder"](this.cardBody);
        // A map's title names its statistic
        if (this.cardElements["map"]) {
            this.cardElements["map"].onLegendChange(() => this.refreshTitle());
        }
        this.refreshTitle();
        // A chart's table follows its plot area, and its cells' actions act on the chart (see
        // tableActions and TABLE_ACTIONS)
        if (this.cardElements["plot"] && this.cardElements["table"]) {
            const { plot, table } = this.cardElements;
            plot.onChartAreaChange(() => table.alignTo(plot.getChartAreaOrigin()));
            table.actions = tableActions[this.cardType] ?? null;
            table.onCellAction = (entry) => {
                const action = TABLE_ACTIONS[entry.action];
                if (!action) {
                    console.warn(`Unknown table cell action "${entry.action}".`);
                    return;
                }
                action.run(this, entry);
            };
            table.isCellActive = (entry) => TABLE_ACTIONS[entry.action]?.isActive(this, entry) ?? false;
        }

        if (this.cardElements["table"]) {
            this.toggleTableButton = this.cardButtonGroup.append("span").append("button")
                    .attr("class", "card-button mi w3-button w3-ripple w3-right capture-ignore")
                    .attr("title", "Toggle display table")
                    .text("table_chart")
                    .on("click", (event) => {
                        this.cardElements["table"].tableContainer.classed("w3-hide", !this.cardElements["table"].tableContainer.classed("w3-hide"));
                    });
        }
        if (this.cardElements["controlPanel"]) {
            this.openMapControlPanelButton = this.cardButtonGroup.append("span").append("button")
                    .attr("class", "card-button mi w3-button w3-ripple w3-right capture-ignore")
                    .attr("title", "Open Control Panel")
                    .text("settings")
                    .on("click", (event) => {
                        this.cardElements["controlPanel"].controlPanelContainer.classed("w3-hide", !this.cardElements["controlPanel"].controlPanelContainer.classed("w3-hide"));
                    });
        }
        if (this.cardElements["editor"]) {
            this.editModeButton = this.cardButtonGroup.append("span").append("button")
                    .attr("class", `card-button mi w3-button w3-ripple w3-right capture-ignore ${REPORT_EDIT_ONLY_CLASS}`)
                    .on("click", (event) => {
                        const editor = this.cardElements["editor"];
                        editor.changeEditMode(!editor.options.editMode);
                        this.refreshEditModeButton();
                    });
            this.refreshEditModeButton();
        }

        // Fills data in the card
        this.update(currentDataIndex);
    }

    update(index) {
        for (const elementKey of Object.keys(this.cardElements)) {
            this.cardElements[elementKey].update(index);
        }
    }

    resize(size) {
        for (const elementKey of Object.keys(this.cardElements)) {
            this.cardElements[elementKey].resize(size);
        }
    }

    /**
     * Destroys the card's elements that need it (charts, editors); removing the card's DOM is up
     * to the caller.
     */
    destroy() {
        for (const elementKey in this.cardElements) {
            if (this.cardElements[elementKey].destroy) {
                this.cardElements[elementKey].destroy();
            }
        }
    }

    getProperties() {
        let cardElementsProps = {};
        for (const key in this.cardElements) {
            const elementProperties = this.cardElements[key].getProperties();
            if (Object.keys(elementProperties) .length > 0) {
                cardElementsProps[key] = elementProperties;
            }
        }

        return {
            smpgCardType: this.cardType,
            ...(this.customTitle ? { title: this.customTitle } : {}),
            ...(this.helpId ? { help: this.helpId } : {}),
            showHeader: this.showHeader,
            ...cardElementsProps,
        };
    }

    /**
     * Whether this report offers a card type (the map and forecast types depend on the data).
     * @param {string} cardType - The card type's name.
     * @returns {boolean}
     */
    isAvailableCardType(cardType) {
        return Object.prototype.hasOwnProperty.call(this.cardTypes, cardType);
    }

    /**
     * Applies a patch of properties to this card, in the same shape returned by getProperties().
     * If smpgCardType is included and differs from the current type, the card is switched first,
     * then the remaining keys are forwarded to the matching cardElements' own setProperties().
     * A type this report doesn't offer makes the card an "Empty Widget", and is kept in
     * invalidCardType until the next call, for the caller to report.
     * @param {Object} properties - Properties to apply, keyed like getProperties()'s output.
     */
    setProperties(properties) {
        this.invalidCardType = null;
        if (properties.smpgCardType) {
            let cardType = properties.smpgCardType;
            if (!this.isAvailableCardType(cardType)) {
                this.invalidCardType = cardType;
                cardType = "Empty Widget";
            }
            if (cardType !== this.cardType) {
                this.changePlot(cardType);
            }
        }
        // Not for the empty widget replacing a type this report doesn't offer
        if ("title" in properties && !this.invalidCardType) {
            this.setCustomTitle(properties.title);
        }
        if ("help" in properties && !this.invalidCardType) {
            this.setHelp(properties.help);
        }
        if ("showHeader" in properties) {
            this.changeHeaderDisplay(properties.showHeader !== false);
        }
        for (const key in properties) {
            if (key === "smpgCardType" || key === "title" || key === "help" || key === "showHeader") { continue; }
            const element = this.cardElements[key];
            if (element && element.setProperties) {
                element.setProperties(properties[key]);
            }
        }
        if (this.cardElements["controlPanel"] && this.cardElements["controlPanel"].refresh) {
            this.cardElements["controlPanel"].refresh();
        }
        if (this.cardElements["editor"]) {
            this.refreshEditModeButton();
        }
    }

    /**
     * Shows or hides the card's header in reader mode (edit mode shows it striped when hidden).
     * @param {boolean} state - True to show the header.
     */
    changeHeaderDisplay(state) {
        if (state === this.showHeader) { return; }
        this.showHeader = state;
        this.refreshHeaderDisplay();
        // The body's height changes in reader mode
        handleResize();
    }

    /**
     * Sets the card's hidden-header class, and the header toggle button's icon and title.
     */
    refreshHeaderDisplay() {
        this.cardContainer.classed("header-hidden", !this.showHeader);
        this.headerDisplayButton
            .attr("title", this.showHeader ? "Hide header (in reader mode)" : "Show header")
            .text(this.showHeader ? "web_asset_off" : "web_asset");
    }

    /**
     * Sets the card's title: its custom title or its type's, and a map's statistic ("Map: Average
     * Total").
     */
    refreshTitle() {
        const statId = this.cardElements["map"]?.options.legend_stat;
        const title = this.customTitle ?? this.getTypeTitle();
        this.graphTypeSelectOpenButton.text(statId && statId !== "None" ? `${title}: ${getMapStatLabel(statId)}` : title);
    }

    /**
     * Returns the card type's own title, shown without a custom title.
     * @returns {string}
     */
    getTypeTitle() {
        return this.cardTypes[this.cardType]["full title"];
    }

    /**
     * Sets the card's custom title, shown instead of its type's while it keeps its type.
     * @param {string|null} title - The title; empty or null for the type's own.
     */
    setCustomTitle(title) {
        this.customTitle = String(title ?? "").trim() || null;
        this.refreshTitle();
    }

    /**
     * Sets the help opened by the card's help button.
     * @param {string|null} helpId - One of HELP_TEXTS' ids, or null for no help button. An
     *     unknown id is dropped, with a warning.
     */
    setHelp(helpId) {
        if (helpId != null && !hasHelp(helpId)) {
            console.warn(`Unknown help "${helpId}", the card has no help button.`);
        }
        this.helpId = hasHelp(helpId) ? helpId : null;
        this.refreshHelpButton();
    }

    /**
     * Shows the help button only while the card has a help.
     */
    refreshHelpButton() {
        this.helpButton.classed("w3-hide", this.helpId === null);
    }

    /**
     * Maximizes the card to fill the report, or restores it (see setMaximizedCard()).
     */
    toggleMaximize() {
        setMaximizedCard(maximizedCard === this ? null : this);
    }

    /**
     * Sets the maximize button's icon and title from whether the card is maximized.
     */
    refreshMaximizeButton() {
        const maximized = maximizedCard === this;
        this.maximizeButton
            .attr("title", maximized ? "Restore window" : "Maximize window")
            .text(maximized ? "close_fullscreen" : "open_in_full");
    }

    /**
     * Sets the edit/view toggle button's icon and title from the editor's current mode.
     */
    refreshEditModeButton() {
        const editMode = this.cardElements["editor"].options.editMode;
        this.editModeButton
            .attr("title", editMode ? "Switch to view mode" : "Switch to edit mode")
            .text(editMode ? "visibility" : "edit");
    }
}