// This file contains the classes and code to construct the widgets that
// contain the plots, maps, and other type of data

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
            // New data can change the axes' widths, so where the plot area starts
            onrendered: () => this.chartAreaListener?.(),
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

    update(index) {
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
        });
        this.plot.xgrids(this.gridLinesGetter(index));
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

    resize(size) {
        this.plot.resize();
    }

    destroy() {
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

class Table {
    constructor(containerElement, dataGetter) {
        this.containerElement = containerElement;
        this.dataGetter = dataGetter;

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
            
                    table.append("tbody").selectAll("tr")
                        .data(d => data[d])
                        .join("tr").selectAll("td")
                            .data(d => d)
                            .join("td")
                                .call(td => {
                                    td.text((d) => {
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
     *   (default true) false hides the header in reader mode. A type this
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
        // A custom title belongs to the type it was given for
        if (cardType !== this.cardType) {
            this.customTitle = null;
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
        // A chart's table follows its plot area
        if (this.cardElements["plot"] && this.cardElements["table"]) {
            const { plot, table } = this.cardElements;
            plot.onChartAreaChange(() => table.alignTo(plot.getChartAreaOrigin()));
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
                    .attr("class", `card-button mi w3-button w3-ripple w3-right capture-ignore ${REPORT_EDIT_ONLY_CLASS}`)
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
        if ("showHeader" in properties) {
            this.changeHeaderDisplay(properties.showHeader !== false);
        }
        for (const key in properties) {
            if (key === "smpgCardType" || key === "title" || key === "showHeader") { continue; }
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
        this.graphTypeSelectOpenButton.text(statId && statId !== "None" ? `${title}: ${statId}` : title);
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