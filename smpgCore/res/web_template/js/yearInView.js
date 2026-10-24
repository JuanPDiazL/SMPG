// This file contains the year in view: a past year shown next to the current season, chosen with
// the header's selector

"use strict";

// The year in view (one of datasetProperties.year_ids), or null. It's kept in the address's
// year_in_view parameter, so links and the browser's history keep it; handleNavigation() reads
// it (see readYearInView()).
var yearInView = null;

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
    const year = params["year_in_view"] ?? null;
    if (year !== null && !datasetProperties.year_ids.includes(year)) {
        console.warn(`year_in_view: this report has no year "${year}"; no year is in view.`);
        yearInView = null;
    } else {
        yearInView = year;
    }
    refreshYearInViewSelector();
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
 * getPlotColor()), and one to have no year in view.
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
            body.append("div").attr("class", "year-in-view-years");
        },
    });
    dialog.body.select(".year-in-view-none").property("disabled", yearInView === null);
    dialog.body.select(".year-in-view-years").selectAll("button")
        .data(datasetProperties.year_ids)
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
    dialog.open();
}

/**
 * Closes the year in view window and selects a year, or none.
 * @param {string|null} year - One of datasetProperties.year_ids, or null for none.
 */
function chooseYearInView(year) {
    dialogs["yearInViewModal"]?.close();
    setYearInView(year);
}
