// This file contains the report's windows (w3-modal dialogs): the warning window, About this data,
// and Save layout. Each is built the first time it opens, then reused.

"use strict";

// The windows built so far, by id
const dialogs = {};

/**
 * Returns a window, building it the first time: a w3-modal with a header (its title and a close
 * button) and an empty body. It closes with its close button, Esc, or a click outside it.
 * @param {string} id - The window's element id.
 * @param {Object} options
 * @param {string} options.title - The header's title.
 * @param {string} [options.className] - Classes for the w3-modal element, e.g. for its styles.
 * @param {string} [options.bodyClass] - Classes for the body, added to w3-container.
 * @param {string} [options.headerClass] - The header's color class.
 * @param {string} [options.titleTag] - The title's heading element.
 * @param {string} [options.closeClass] - Classes for the close button, added to w3-button.
 * @param {string} [options.closeText] - The close button's text (an icon name with .mi).
 * @param {Function} [options.onClose] - Called after it closes.
 * @param {Function} [options.build] - Fills the body (a d3 selection), once.
 * @returns {Object} {modal, body, open(), close()}; modal and body are d3 selections.
 */
function getDialog(id, {
    title, className = "", bodyClass = "", headerClass = "w3-blue-grey", titleTag = "h3",
    closeClass = "mi w3-ripple", closeText = "close", onClose = () => {}, build = () => {},
}) {
    if (dialogs[id]) { return dialogs[id]; }
    const modal = d3.select("body").append("div")
        .attr("id", id)
        .attr("class", `w3-modal ${className}`);
    const content = modal.append("div")
        .attr("class", "w3-modal-content w3-card-4");
    const header = content.append("header")
        .attr("class", `w3-container ${headerClass}`);
    const dialog = {
        modal,
        body: content.append("div").attr("class", `w3-container ${bodyClass}`),
        open: () => modal.style("display", "block"),
        close: () => {
            modal.style("display", "none");
            onClose();
        },
    };
    header.append("button")
        .attr("class", `w3-button w3-display-topright ${closeClass}`)
        .attr("title", "Close")
        .text(closeText)
        .on("click", dialog.close);
    header.append(titleTag).text(title);

    modal.on("click", (event) => {
        if (event.target === modal.node()) { dialog.close(); }
    });
    // In the capture phase, so it runs before the maximized widget's Esc (see
    // setupMaximizedCardEscape()), whichever was added first
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style("display") === "block") {
            dialog.close();
            // So the same Esc doesn't also restore a maximized widget
            event.preventDefault();
        }
    }, true);
    build(dialog.body);
    dialogs[id] = dialog;
    return dialog;
}

// Warning window

/**
 * Returns the warning window, with its red header.
 * @returns {Object} See getDialog().
 */
function getWarningDialog() {
    return getDialog("modal", {
        title: "Warning",
        headerClass: "w3-red",
        titleTag: "h2",
        closeClass: "w3-ripple w3-hover-pale-red",
        closeText: "×",
        // The message isn't kept once it's read
        onClose: () => dialogs["modal"].body.select("p").html(""),
        build: (body) => body.append("p").attr("id", "modalText"),
    });
}

/**
 * Displays a modal dialog with the given message and a "Warning" header.
 * @param {string} message - The HTML content to display in the modal body.
 */
function showModal(message) {
    const dialog = getWarningDialog();
    dialog.body.select("p").html(message);
    dialog.open();
}

/**
 * Hides the warning window and clears its message.
 */
function closeModal() {
    getWarningDialog().close();
}

// About this data window

/**
 * Returns the rows of the About this data window, from the report's data.
 * @returns {Array<Array<string>>} [label, value] pairs.
 */
function getAboutDataRows() {
    const yearRange = (years) => years.length > 0 ? `${years[0]}–${getLast(years)}` : "None";
    // The analog years are a list, or a number: each place's most similar years
    const selectedYears = datasetProperties.selected_years ?? [];
    const analogYears = Array.isArray(selectedYears) ? selectedYears : null;
    const forecastLength = parameters.forecast_length;
    const unit = period_unit.toLowerCase();
    return [
        ["Dataset", datasetProperties.dataset_name],
        ["Climatology average (LTA) period", yearRange(datasetProperties.climatology_year_ids)],
        ["Historical distribution (for percentiles)", yearRange(datasetProperties.year_ids)],
        analogYears
            ? [`Analog years (${analogYears.length})`, analogYears.length > 0 ? analogYears.join(", ") : "None"]
            : [`Analog years (${selectedYears})`, "The most similar years for each place"],
        ["Forecast", forecastLength > 0
            ? `Yes (${forecastLength} ${unit}${forecastLength === 1 ? "" : "s"})` : "No"],
        ["Start of Season detection", parameters.rainy_season_detection_enabled ? "Enabled" : "Disabled"],
    ];
}

/**
 * Opens the About this data window: the details of the report's data and settings.
 */
function openAboutDataDialog() {
    const dialog = getDialog("aboutDataModal", {
        title: "About this data",
        className: "about-data-modal",
        bodyClass: "about-data-body",
        build: (body) => body.append("table")
            .attr("id", "aboutDataTable")
            .attr("class", "w3-table about-data-table"),
    });
    dialog.body.select("table").selectAll("tr")
        .data(getAboutDataRows())
        .join("tr")
        .selectAll("td")
            .data(row => row)
            .join("td")
            .text(d => d);
    dialog.open();
}

/**
 * Closes the About this data window.
 */
function closeAboutDataDialog() {
    dialogs["aboutDataModal"]?.close();
}

// Save layout window

/**
 * Returns the full path of this report's data/layout.js on the reader's computer, from the page's
 * address: "/home/me/r27/data/layout.js", "C:\Users\me\r27\data\layout.js", or
 * "\\server\share\r27\data\layout.js" for a network share.
 * @param {Location|URL} [location] - The page's address.
 * @returns {string|null} null when the page isn't a local file (e.g. served over http).
 */
function getLayoutFilePath(location = window.location) {
    if (location.protocol !== "file:") { return null; }
    // The page's folder, with its trailing slash
    const path = decodeURIComponent(location.pathname).replace(/[^/]*$/, "") + "data/layout.js";
    if (location.host) {
        return `\\\\${location.host}${path.replace(/\//g, "\\")}`;
    }
    if (/^\/[A-Za-z]:\//.test(path)) {
        return path.slice(1).replace(/\//g, "\\");
    }
    return path;
}

// The layout.js text built when the Save layout window opened
let saveLayoutContent = "";

/**
 * Copies text to the clipboard for the Save layout window, and says so. Without clipboard access,
 * the text is selected in a box instead, for the reader to copy.
 * @param {string} text - The text to copy.
 * @param {string} what - What it is, for the message ("Path", "Layout").
 */
async function copySaveLayoutText(text, what) {
    const status = document.getElementById("saveLayoutStatus");
    const fallback = document.getElementById("saveLayoutFallbackText");
    try {
        await navigator.clipboard.writeText(text);
        fallback.classList.add(HIDE_CLASS);
        status.textContent = `${what} copied.`;
    } catch (error) {
        fallback.value = text;
        fallback.classList.remove(HIDE_CLASS);
        fallback.focus();
        fallback.select();
        status.textContent = `${what} couldn't be copied automatically: it's selected below, press`
            + " Ctrl+C (Cmd+C on a Mac) to copy it.";
    }
}

/**
 * Fills the Save layout window: where this report's layout.js is, and two ways to replace it.
 * @param {d3.Selection} body - The window's body.
 */
function buildSaveLayoutDialog(body) {
    const button = (parent, id, text, onClick) => parent.append("button")
        .attr("id", id)
        .attr("class", "w3-button w3-blue-grey w3-ripple")
        .text(text)
        .on("click", onClick);
    // Steps, as HTML: they hold <code> file names
    const steps = (items) => body.append("ol").selectAll("li")
        .data(items)
        .join("li")
        .html(d => d);

    body.append("p").html("The layout (the widgets, their settings and texts) is saved in this"
        + " report's <code>layout.js</code> file. Replace it with the current layout:");
    const pathRow = body.append("div")
        .attr("id", "saveLayoutPathRow")
        .attr("class", "save-layout-path");
    pathRow.append("code").attr("id", "saveLayoutPath");
    button(pathRow, "saveLayoutCopyPathButton", "Copy path",
        () => copySaveLayoutText(getLayoutFilePath(), "Path"));
    body.append("p")
        .attr("id", "saveLayoutNoPath")
        .attr("class", HIDE_CLASS)
        .html("The file is <code>layout.js</code>, in the <code>data</code> folder next to the"
            + " report's <code>index.html</code>.");

    body.append("h4").text("Option A: download");
    button(body, "saveLayoutDownloadButton", "Download layout.js", () => {
        downloadFile("layout.js", saveLayoutContent, "text/javascript");
        document.getElementById("saveLayoutFallbackText").classList.add(HIDE_CLASS);
        document.getElementById("saveLayoutStatus").textContent = "layout.js downloaded.";
    });
    steps([
        "If the browser asks where to save it, paste the copied path into the file name box.",
        "Otherwise, move <code>layout.js</code> from your Downloads folder into the report's"
            + " <code>data</code> folder, replacing the old file.",
    ]);

    body.append("h4").text("Option B: copy");
    button(body, "saveLayoutCopyLayoutButton", "Copy layout",
        () => copySaveLayoutText(saveLayoutContent, "Layout"));
    steps([
        "Open the report's <code>data/layout.js</code> in a text editor (e.g. Notepad).",
        "Select everything, paste, and save.",
    ]);

    body.append("p")
        .attr("id", "saveLayoutStatus")
        .attr("class", "save-layout-status")
        .attr("aria-live", "polite");
    body.append("textarea")
        .attr("id", "saveLayoutFallbackText")
        .attr("class", `save-layout-fallback ${HIDE_CLASS}`)
        .attr("readonly", "");
    body.append("p").html("<b>Then reload this page</b> to check the saved layout.");
}

/**
 * Opens the Save layout window: the path of this report's layout.js, and the current layout to
 * download or copy into it. Browsers can't write the file themselves.
 */
function openSaveLayoutDialog() {
    const dialog = getDialog("saveLayoutModal", {
        title: "Save layout",
        className: "save-layout-modal",
        bodyClass: "save-layout-body",
        build: buildSaveLayoutDialog,
    });
    saveLayoutContent = buildLayoutJsContent();
    const path = getLayoutFilePath();
    document.getElementById("saveLayoutPath").textContent = path ?? "";
    document.getElementById("saveLayoutPathRow").classList.toggle(HIDE_CLASS, path === null);
    document.getElementById("saveLayoutNoPath").classList.toggle(HIDE_CLASS, path !== null);
    document.getElementById("saveLayoutStatus").textContent = "";
    document.getElementById("saveLayoutFallbackText").classList.add(HIDE_CLASS);
    dialog.open();
}

/**
 * Closes the Save layout window.
 */
function closeSaveLayoutDialog() {
    dialogs["saveLayoutModal"]?.close();
}
