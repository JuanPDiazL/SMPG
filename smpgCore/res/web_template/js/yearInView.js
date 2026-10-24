// This file contains the year in view: a past year shown next to the current season, chosen with
// the header's selector

"use strict";

// The year in view (one of datasetProperties.year_ids), or null. It's kept in the address's
// year_in_view parameter, so links and the browser's history keep it; handleNavigation() reads
// it (see readYearInView()).
var yearInView = null;

// The maps' statistic for the year in view: its accumulation up to the current period, as a
// percent of the LTA at that period (see getYearInViewPctOfAverage())
const YEAR_IN_VIEW_MAP_STAT = "Year in View: % of Average";

/**
 * Selects the year in view, or none, by changing the address.
 * @param {string|null} year - One of datasetProperties.year_ids, or null for none.
 */
function setYearInView(year) {
    if (year === null) {
        removeHashParams("year_in_view");
    } else {
        navigateTo({ year_in_view: year });
    }
}

/**
 * Sets yearInView from the address's parameters; a year the report has no data for counts as none.
 * @param {Object} params - The address's hash parameters, see getHashParamsObject().
 */
function readYearInView(params) {
    const previousYear = yearInView;
    const year = params["year_in_view"] ?? null;
    if (year !== null && !datasetProperties.year_ids.includes(year)) {
        console.warn(`year_in_view: this report has no year "${year}"; no year is in view.`);
        yearInView = null;
    } else {
        yearInView = year;
    }
    refreshYearInViewSelector();
    applyYearInViewToMaps(previousYear);
}

/**
 * Returns the year in view's accumulation from the start of the season monitoring up to the
 * current period, as a percent of the LTA at the same period (at the season's end when the
 * current season is ignored). The plugin computes it from the exact values, as it does
 * 'Total up to Current Period Pct. of Avg.' for the current season.
 * @param {string} place - The place.
 * @returns {number|null} The percent, or null without a year in view or its data.
 */
function getYearInViewPctOfAverage(place) {
    return yearInView ? (seasonal_pct_of_avg[place]?.[yearInView] ?? null) : null;
}

/**
 * Returns how the maps name a statistic: the year in view's says which year it is.
 * @param {string} statId - A map statistic.
 * @returns {string} E.g. "1994-1995, % of Average".
 */
function getMapStatLabel(statId) {
    return statId === YEAR_IN_VIEW_MAP_STAT && yearInView ? `${yearInView}, % of Average` : statId;
}

/**
 * Shows a change of year in view on the maps. Selecting a year makes every map show it, keeping
 * the map's statistic to go back to; another year redraws the maps showing it; no year puts
 * them back on their kept statistic (a statistic picked meanwhile stays).
 * @param {string|null} previousYear - The year in view before the change.
 */
function applyYearInViewToMaps(previousYear) {
    if (yearInView === previousYear) { return; }
    for (const card of Object.values(cards)) {
        const { map, controlPanel, mapDescription } = card.cardElements;
        if (!map) { continue; }
        const showsYear = map.options.legend_stat === YEAR_IN_VIEW_MAP_STAT;
        if (previousYear === null) {
            map.statBeforeYearInView = map.options.legend_stat;
            map.changeLegend(YEAR_IN_VIEW_MAP_STAT);
        } else if (yearInView === null) {
            if (showsYear) { map.changeLegend(map.statBeforeYearInView ?? "None"); }
            map.statBeforeYearInView = null;
        } else if (showsYear) {
            map.changeLegend(YEAR_IN_VIEW_MAP_STAT);
        }
        controlPanel?.refreshStatOptions();
        mapDescription?.changeStat(map.options.legend_stat);
    }
}

/**
 * Builds the header's year in view selector: a button opening the year in view window.
 */
function buildYearInViewSelector() {
    const button = d3.select("#contentHeaderYear").append("button")
        .attr("class", "w3-button w3-ripple year-in-view-button")
        .attr("title", "Choose a past year to view")
        .on("click", openYearInViewDialog);
    button.append("span").attr("class", "mi").text("history");
    button.append("span").attr("class", "year-in-view-label");
    refreshYearInViewSelector();
}

/**
 * Shows the year in view in the header's selector.
 */
function refreshYearInViewSelector() {
    d3.select("#contentHeaderYear .year-in-view-label").text(`Year in view: ${yearInView ?? "none"}`);
}

/**
 * Opens the year in view window: a button for each past year, in its color in the charts (see
 * getPlotColor()), and one to have no year in view. Only the selected years are listed by
 * default (see refreshYearInViewYears()).
 */
function openYearInViewDialog() {
    const dialog = getDialog("yearInViewModal", {
        title: "Year in view",
        className: "year-in-view-modal",
        bodyClass: "year-in-view-body",
        build: (body) => {
            body.append("button")
                .attr("class", "w3-button w3-border year-in-view-none")
                .text("No year in view")
                .on("click", () => chooseYearInView(null));
            const filter = body.append("label").attr("class", "year-in-view-filter");
            filter.append("input")
                .attr("type", "checkbox")
                .attr("class", "w3-check year-in-view-only-selected")
                .property("checked", true)
                .on("change", refreshYearInViewYears);
            filter.append("span").text("Only selected years");
            body.append("div").attr("class", "year-in-view-years");
        },
    });
    dialog.body.select(".year-in-view-none").property("disabled", yearInView === null);
    refreshYearInViewYears();
    dialog.open();
}

/**
 * Lists the year in view window's years: all past years, or only the selected ones (the years
 * the current season is compared with, which can differ per place). The year in view is
 * always listed.
 */
function refreshYearInViewYears() {
    const body = dialogs["yearInViewModal"].body;
    let years = datasetProperties.year_ids;
    if (body.select(".year-in-view-only-selected").property("checked")) {
        const selected = Object.keys(selected_seasons_cumsum[currentDataIndex] ?? {});
        years = years.filter((year) => selected.includes(year) || year === yearInView);
    }
    body.select(".year-in-view-years").selectAll("button")
        .data(years)
        .join((enter) => {
            const yearButton = enter.append("button")
                .attr("class", "w3-button w3-border year-in-view-year")
                .on("click", (event, year) => chooseYearInView(year));
            yearButton.append("span").attr("class", "year-in-view-swatch");
            yearButton.append("span").attr("class", "year-in-view-year-label");
            return yearButton;
        })
        .classed("year-in-view-selected", (year) => year === yearInView)
        .attr("aria-pressed", (year) => year === yearInView)
        .call((yearButton) => {
            yearButton.select(".year-in-view-swatch").style("background-color", (year) => getPlotColor(year));
            yearButton.select(".year-in-view-year-label").text((year) => year);
        });
}

/**
 * Closes the year in view window and selects a year, or none.
 * @param {string|null} year - One of datasetProperties.year_ids, or null for none.
 */
function chooseYearInView(year) {
    dialogs["yearInViewModal"]?.close();
    setYearInView(year);
}
