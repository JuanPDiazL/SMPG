// This file contains utility functions and options

"use strict";

// Constants
const SMPG_COOKIE_PREFIX = 'SMPG_';
const DARKMODE_COOKIE_NAME = `${SMPG_COOKIE_PREFIX}DARKMODE`;
const MENU_HIDE_STATE_COOKIE_NAME = `${SMPG_COOKIE_PREFIX}MENU_HIDE_STATE`;

const SHORT_NAMES = {
    "Pentad": "Ptd.",
    "Dekad": "Dek.",
    "Month": "Mth.",
};

const HIDE_CLASS = 'w3-hide';
// Reader mode: <body> gets REPORT_READER_MODE_CLASS, which hides the elements with
// REPORT_EDIT_ONLY_CLASS (see css/style.css)
const REPORT_READER_MODE_CLASS = "report-reader-mode";
const REPORT_EDIT_ONLY_CLASS = "report-edit-only";

/**
 * Navigates to a new URL hash.
 * @param {Object} queryParams - Key-value pairs of query parameters to set in the URL hash.
 * @param {boolean} keepOlpParams - If true, preserves existing hash parameters; otherwise replaces them entirely. Default is true.
 */
function navigateTo(queryParams={}, keepOlpParams=true) {
    const oldParams = keepOlpParams? getHashParamsObject() : {};
    const newParams = {...oldParams, ...queryParams };
    const paramsString = new URLSearchParams(newParams).toString();
    window.location.hash = paramsString;
}

/**
 * Handles navigation events triggered by URL hash changes.
 * Validates the selected place, updates the current data index, refreshes all cards,
 * highlights the corresponding sidebar element, and applies (then removes) a "modify_layout"
 * hash parameter if present. Shows a warning modal if the place is invalid or modify_layout
 * is not valid JSON.
 * @param {Object} event - The navigation event containing the oldUrl property.
 */
function handleNavigation(event) {
    const oldUrl = event.oldUrl;
    const params = getHashParamsObject();
    const place = params['place'];
    setReportEditMode(params["edit_mode"] === "true");

    if (Object.values(datasetProperties["place_ids"]).includes(place)){
        currentDataIndex = place;
    }
    else{
        showModal(`There is no data for ${place}.<br>Please check for a possible mismatch between the dataset and the selected target field from the shapefile.<br>Selected Region ID: ${place}<br>Target Field: ${parameters.target_id_field}`);
        return;
    }
    // The rest of the report's details are in the About this data window
    const monitoringIds = datasetProperties.sub_season_monitoring_ids;
    HEADER.text(`Region ID: ${place} · Monitoring season: [${monitoringIds[0]},`
        + ` ${getLast(monitoringIds)}] ${datasetProperties.current_season_id} · Current ${period_unit.toLowerCase()}: ${getCurrentPeriodId()}`);

    for (const card of Object.values(cards)) {
        card.update(currentDataIndex);
    }

    if(previousSelectionElement != null) {
        previousSelectionElement.classList.remove('selected');
    }
    sidebarElements[currentDataIndex].classList.add('selected');

    previousSelectionElement = sidebarElements[currentDataIndex];

    const modifyLayoutParam = params['modify_layout'];
    if (modifyLayoutParam) {
        try {
            const widgetPatches = JSON.parse(modifyLayoutParam);
            // Text content can't be set from a URL for security purposes (malicious text injection).
            for (const widgetId in widgetPatches) {
                const editorPatch = widgetPatches[widgetId] && widgetPatches[widgetId].editor;
                if (editorPatch && typeof editorPatch === "object" && "text" in editorPatch) {
                    delete editorPatch.text;
                    console.warn(`modify_layout: the text of widget "${widgetId}" can't be changed through the URL; it was ignored.`);
                }
            }
            applyLayoutModifications(widgetPatches);
        } catch (e) {
            showModal(`The "modify_layout" URL parameter could not be applied: invalid JSON.<br>${e.message}`);
        }
        removeHashParams('modify_layout');
    }
}

/**
 * Handles window resize events with debouncing. Recalculates content height,
 * updates grid cell dimensions, and resizes all map and plot card elements.
 * @param {Event} event - The resize event (unused; debounce is handled internally).
 */
function handleResize(event) {
    clearTimeout(resizeTimeout);
    updateMaximizedWidget();
    resizeTimeout = setTimeout(() => {
        // The grid fills the window below the header, inside the content's padding
        const headerHeight = d3.select("#contentHeader").node().getBoundingClientRect().height;
        const body = getComputedStyle(document.getElementById("contentBody"));
        const bodyPadding = parseFloat(body.paddingTop) + parseFloat(body.paddingBottom);
        contentHeight = Math.max(900, window.innerHeight - headerHeight - bodyPadding);
        grid.cellHeight(contentHeight/GS_V_RES);
        for (const card of Object.values(cards)) {
            for (const elementKey of Object.keys(card.cardElements)) {
                if (["map", "plot"].includes(elementKey)) {
                    const container = card.cardBody.node();
                    // Get container dimensions
                    const rect = container.getBoundingClientRect();
                    const width = rect.width;
                    const height = rect.height;

                    card.cardElements[elementKey].resize([width, height]);
                }
            }
        }
    }, resizeDelay);
}

/**
 * Retrieves query parameters from the current URL hash fragment.
 * @param {string} [param=null] - Optional parameter name. If provided, returns only that parameter's value; otherwise returns the full URLSearchParams object.
 * @returns {string|URLSearchParams} The value of the specified parameter, or all hash parameters as a URLSearchParams instance.
 */
function getHashParams(param=null) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the leading '#'
    if (param) {
        return hashParams.get(param);
     } else {
        return hashParams;
     }
}

/**
 * Returns all URL hash parameters as a plain JavaScript object.
 * @returns {Object} An object with keys and values corresponding to the current hash query string.
 */
function getHashParamsObject() {
    const urlSearchParams = getHashParams();
    return Object.fromEntries(urlSearchParams.entries());
}

/**
 * Removes one or more parameters from the URL hash, leaving all other parameters untouched.
 * @param {...string} paramNames - Names of the hash parameters to remove.
 */
function removeHashParams(...paramNames) {
    const hashParams = getHashParams();
    for (const paramName of paramNames) {
        hashParams.delete(paramName);
    }
    window.location.hash = hashParams.toString();
}

/**
 * Retrieves the value of a cookie by name.
 * @param {string} cname - The name of the cookie to look up.
 * @returns {string} The decoded cookie value, or an empty string if not found.
 */
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/**
 * Sets a cookie with the given name and value. The cookie expires in 1 day and uses SameSite=Strict.
 * @param {string} name - The name of the cookie.
 * @param {string|number} value - The value to store in the cookie.
 */
function setCookie(name, value) {
    var date = new Date();
    date.setDate(date.getDate() + 1); // expire in 1 day

    document.cookie = `${name}=${value}; expires=${date.toUTCString()}; SameSite=Strict`;
}

/**
 * Checks whether a global variable with the given name has been declared.
 * @param {string} variableName - The name of the global variable to check.
 * @returns {boolean} True if the variable is defined on the window object, false otherwise.
 */
function isDeclared(variableName) {
    return typeof window[variableName] !== "undefined";   
}

/**
 * Sets the dark mode preference via cookie and toggles the 'darkmode' class on <body>.
 * @param {string} value - "true" to enable dark mode, any other value to disable it.
 */
function setDarkMode(value) {
    setCookie(DARKMODE_COOKIE_NAME, value);
    if (value === "true") {
        document.body.classList.add('darkmode');
    } else {
        document.body.classList.remove('darkmode');
    }
}

/**
 * Toggles dark mode on or off by flipping the 'darkmode' class and persisting the state to a cookie.
 */
function toggleDarkMode() {
    setCookie(DARKMODE_COOKIE_NAME, document.body.classList.toggle('darkmode'));
}

/**
 * Zips multiple arrays together element-wise, truncating to the shortest array length.
 * @param {...Array} arrays - Two or more arrays to zip together.
 * @returns {Array<Array>} An array of arrays, where each inner array contains the i-th elements from all input arrays.
 */
function zip(...arrays) {
  const minLength = Math.min(...arrays.map(arr => arr.length));
  return Array.from({ length: minLength }, (_, i) => 
    arrays.map(arr => arr[i])
  );
}

/**
 * Returns the last element of an array.
 * @param {Array} arr - The array to retrieve the last element from.
 * @returns {*} The last element, or undefined if the array is empty.
 */
function getLast(arr) {
    return arr[arr.length - 1];
}

/**
 * Escapes the characters that have a special meaning in HTML (& < > " ').
 * @param {*} value - The value to escape; it is converted to a string first.
 * @returns {string} The escaped string, safe to insert into HTML text or attribute values.
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/**
 * Sets the sidebar menu open/closed state via cookie and toggles the 'sidebar-closed' class on <body>.
 * @param {string} value - "true" or falsy to close the sidebar, "false" to open it.
 */
function setMenuState(value) {
    setCookie(MENU_HIDE_STATE_COOKIE_NAME, value);
    if (!value || value === "true") {
        BODY.classList.add('sidebar-closed');
    } else if (value === "false") {
        BODY.classList.remove('sidebar-closed');
    }
}

/**
 * Toggles the sidebar menu open/closed state, persists it to a cookie, and triggers a resize event.
 */
function menuToggle() {
    setCookie(MENU_HIDE_STATE_COOKIE_NAME, BODY.classList.toggle('sidebar-closed'));
    window.dispatchEvent(new Event('resize'));
  }

/**
 * Positions an element directly below a given anchor element.
 * The horizontal position matches the anchor's left style; vertical offset is anchor height + 10px.
 * @param {HTMLElement} element - The element to reposition.
 * @param {HTMLElement} anchor - The reference element to place above.
 */
function placeUnder(element, anchor) {
    const bbox = anchor.getBoundingClientRect();
    const xPos = anchor.style.left;
    const yPos = `${bbox.height + 10}px`;

    element.style.left = xPos;
    element.style.top = yPos;
}

/**
 * Maps a function over the values of an object, preserving original keys.
 * Similar to Array.prototype.map but for objects.
 * @param {Object} obj - The source object whose values will be transformed.
 * @param {Function} fn - A mapping function invoked as fn(value, key, index) for each entry.
 * @returns {Object} A new object with the same keys and transformed values.
 */
function objectMap(obj, fn) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value], index) => [key, fn(value, key, index)])
    );
}

/**
 * Decompresses a base64-encoded pako-inflated string back to its original form.
 * @param {string} data - The base64-encoded compressed data string.
 * @returns {string} The decompressed string.
 */
function decompress(data) {
    const compressedData = atob(data);
    const compressedDataString = compressedData.split('').map(function(x){return x.charCodeAt(0);});
    const compressedDataBin = new Uint8Array(compressedDataString);
    const decompressedString = pako.inflate(compressedDataBin, { to: 'string'});
    return decompressedString;
}

/**
 * Parses a CSV string into an object indexed by the first column value using d3.csvParse.
 * @param {string} csvString - The CSV-formatted string to parse.
 * @param {boolean} excludeIndex - If true (default), removes the auto-generated "" index key from each row.
 * @returns {Object} An object keyed by the first column value, with parsed row data as values.
 */
function csvParse(csvString, excludeIndex=true) {
    let obj = {};
    d3.csvParse(csvString, (data, i, columns) => {
        const typedData = d3.autoType(data, i, columns);
        const index = typedData[""];
        if(excludeIndex) {
            delete typedData[""];
        }
        obj[index] = typedData;
    })
    return obj;
}

/**
 * Parses a CSV string into an object indexed by the first column value using d3.csvParseRows.
 * Unlike csvParse, this treats each row as a plain array without header-based key mapping.
 * @param {string} csvString - The CSV-formatted string to parse.
 * @param {boolean} excludeIndex - If true (default), removes the first element (index) from each parsed row.
 * @returns {Object} An object keyed by the first column value, with remaining row data as array values.
 */
function csvParseRows(csvString, excludeIndex=true) {
    let obj = {};
    d3.csvParseRows(csvString, (data, i) => {
        if (i === 0) {return;} // skip header
        let typedData = d3.autoType(data, i);
        const index = typedData[0];
        if(excludeIndex) {
            typedData = typedData.slice(1)
        } 
        obj[index] = typedData;
    })
    return obj;
}

/**
 * Applies csvParse to each value in an object. Useful for parsing multiple CSV strings stored as object values.
 * @param {Object} obj - An object whose values are CSV-formatted strings.
 * @returns {Object} A new object with the same keys, but values replaced by parsed CSV objects.
 */
function parseObjectCsv(obj) {
    return objectMap(obj, csvParse);
}

/**
 * Parses a JSON string into an object, then applies csvParseRows to each value.
 * @param {string} obj - A JSON string whose parsed values are CSV-formatted strings.
 * @returns {Object} An object with the same keys as the parsed JSON, but values replaced by row-parsed arrays.
 */
function parseRowsObjectCsv(obj) {
    return objectMap(JSON.parse(obj), csvParseRows);
}

/**
 * Filters sidebar list items based on the current value of the "placeSearch" input field.
 * Items whose link text does not match the filter are hidden via the 'place-hidden' class.
 */
function searchFunction(){
    // Declare variables
    var input, filter, ul, li, a, i;
    input = document.getElementById("placeSearch");
    filter = input.value.toUpperCase();
    ul = document.getElementById("placeList");
    li = ul.getElementsByTagName("li");

    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        if (a.innerHTML.toUpperCase().indexOf(filter) > -1) {
            li[i].classList.remove('place-hidden');
        } else {
            li[i].classList.add('place-hidden');
        }
    }
}

/**
 * Confirms a search selection when the Enter key is pressed. Clicks the first visible
 * (non-hidden) place list element in the sidebar.
 * @param {KeyboardEvent} event - The keyboard event to check for Enter key press.
 */
function confirmSearch(event) {
    if(event.key === 'Enter') {
        const placeList = document.getElementById("placeList");
        const selectedPlace = placeList.querySelector('.place-list-element:not(.place-hidden)');
        selectedPlace.firstChild.click();
        console.log(selectedPlace, 'clicked');
    }
}

/**
 * Builds a sidebar navigation menu from a sorted list of place identifiers.
 * Each item is rendered as a clickable link that navigates to the corresponding place via navigateTo().
 * @param {Array} data - An array of place identifier strings. Will be sorted before rendering.
 * @returns {Object} A map of place IDs to their corresponding <a> DOM elements for later selection highlighting.
 */
function makeSelectionMenu(data) {
    const sidebarList = document.getElementById('placeList');
    let sidebarElements = {};
    for (const place of data.toSorted()) {
        const listElement = document.createElement('li');
        listElement.className = 'place-list-element';
        const placeLink = document.createElement('a');
        listElement.appendChild(placeLink);
        sidebarElements[place] = placeLink;
        placeLink.id = place;
        placeLink.className = 'w3-bar-item w3-button w3-ripple';
        placeLink.innerHTML = place;
        placeLink.addEventListener('click', function () {
            navigateTo({"place": place});
        });
        sidebarList.appendChild(listElement);
    }
    return sidebarElements;
}

/**
 * Builds an expandable accordion-style menu from a data object and appends it into the given
 * container. Each entry is rendered as a button showing its icon and title; clicking the menu's
 * trigger toggles the entry list open/closed, and clicking an entry closes the menu and runs
 * its onclick. Element ids are derived from each title via lodash's snakeCase, e.g. "Add widget"
 * becomes "add_widget_menu_item".
 * @param {string} containerSelector - CSS selector for the element to build the menu into.
 * @param {Object} items - Object keyed by entry title, each value {icon, onclick, hidden}.
 *   `icon` is a Material Icons ligature name, `onclick` a no-argument callback, and `hidden`
 *   (optional, default false) whether the entry starts out hidden.
 * @param {Function} [onOpen] - Optional callback, called with the menu's content d3 selection
 *   each time the menu opens, for entries that depend on the report's current state.
 * @returns {Object} A map of entry title to its <button> d3 selection, for later visibility toggling.
 */
function buildHeaderMenu(containerSelector, items, onOpen = null) {
    const menuContainer = d3.select(containerSelector)
        .append("div")
        .attr("class", "header-menu w3-dropdown-click capture-ignore");

    const menuContent = menuContainer.append("div")
        .attr("class", "w3-dropdown-content w3-bar-block w3-border header-menu-content");

    menuContainer.append("span")
        .attr("class", "mi w3-button w3-ripple header-menu-trigger")
        .text("more_vert")
        .on("click.toggleHeaderMenu", () => {
            const opening = !menuContent.classed("w3-show");
            if (opening && onOpen) {
                onOpen(menuContent);
            }
            menuContent.classed("w3-show", opening);
        });

    let menuElements = {};
    for (const title in items) {
        const { icon, onclick, hidden = false, className = "" } = items[title];
        const menuItem = menuContent.append("button")
            .attr("id", `${_.snakeCase(title)}_menu_item`)
            .attr("class", `header-menu-item w3-bar-item w3-button w3-ripple ${className}`)
            .attr("title", title)
            .classed("w3-hide", hidden)
            .on("click", () => {
                menuContent.classed("w3-show", false);
                onclick();
            });
        menuItem.append("span")
            .attr("class", "mi header-menu-item-icon")
            .text(icon);
        menuItem.append("span")
            .attr("class", "header-menu-item-label")
            .text(title);
        menuElements[title] = menuItem;
    }
    return menuElements;
}

/**
 * Rebuilds the header menu's "Restore widget" section: one entry per unloaded widget in
 * layout.gridstackWidgets, which loads it back. Shown only in layout-edit mode, and only when
 * there are unloaded widgets.
 * @param {d3.Selection} menuContent - The header menu's content element.
 */
function refreshRestoreWidgetMenu(menuContent) {
    menuContent.select(".header-menu-restore").remove();
    const unloadedIds = Object.keys(layout.gridstackWidgets)
        .filter((id) => layout.gridstackWidgets[id].unloaded);
    if (!editingLayout || unloadedIds.length === 0) { return; }

    const section = menuContent.append("div")
        .attr("class", "header-menu-restore");
    section.append("div")
        .attr("class", "header-menu-section-label w3-bar-item")
        .text("Restore widget");
    for (const id of unloadedIds) {
        const label = `${layout.gridstackWidgets[id].smpgOpts.smpgCardType} (${id})`;
        const menuItem = section.append("button")
            .attr("id", `restore_${id}_menu_item`)
            .attr("class", "header-menu-item w3-bar-item w3-button w3-ripple")
            .attr("title", `Restore ${label}`)
            .on("click", () => {
                menuContent.classed("w3-show", false);
                loadWidget(id);
            });
        menuItem.append("span")
            .attr("class", "mi header-menu-item-icon")
            .text("unarchive");
        menuItem.append("span")
            .attr("class", "header-menu-item-label")
            .text(label);
    }
}

/**
 * Updates a D3-bound <select> element's options to match the given data array.
 * Uses D3's join pattern to enter new options, keep existing ones, and remove stale entries.
 * @param {d3.Selection} selectElement - The D3 selection of the <select> element.
 * @param {Array<string>} items - The list of option values/texts to populate.
 */
function updateSelect(selectElement, items) {
    selectElement.selectAll("option")
        .data(items)
        .join(
            enter => enter.append("option")
                .attr("value", d => d)
                .text(d => d),
            update => update, // Existing elements don't need changes if data matches
            exit => exit.remove() // Remove options no longer in the data
        );
}

/**
 * Categorizes a value by testing it against each bin's predicate function in order.
 * Returns the name of the first matching bin, or 'Uncategorized' if none match.
 * @param {*} value - The value to categorize.
 * @param {Object} bins - An object mapping bin names to objects containing a 'function' property (predicate) and optionally other data like 'color'.
 * @returns {string} The name of the matching bin category, or 'Uncategorized'.
 */
function categorizeValue(value, bins) {
    for (const [binName, binData] of Object.entries(bins)) {
        const binFunction = binData['function'];
        if (binFunction(value)) {
            return binName;
        }
    }
    return 'Uncategorized';
    
}

/**
 * Extracts an array of color values from a bins configuration object.
 * @param {Object} bins - A bins object where each value has a 'color' property.
 * @returns {Array<string>} An array of color strings, one per bin in definition order.
 */
function getColors(bins) {
    return Object.values(bins).map(bin => bin.color);
}

/**
 * Displays a modal dialog with the given message and a "Warning" header.
 * @param {string} message - The HTML content to display in the modal body.
 */
function showModal(message) {
    MODAL.style.display = "block";
    MODAL_HEADER.textContent = "Warning";
    MODAL_TEXT.innerHTML = message;
}

/**
 * Hides the modal dialog and clears its header and body content.
 */
function closeModal() {
    MODAL.style.display = "none";
    MODAL_HEADER.textContent = "";
    MODAL_TEXT.innerHTML = "";
}

/**
 * Adds a new widget card to the grid layout.
 * Increments the global widget counter, merges provided options with defaults,
 * and registers a new chartCard instance for tracking.
 * @param {Object} options - Widget configuration options (e.g., smpgCardType, w, h). Overrides default values.
 */
function add_widget(options={}) {
    gridstackWidgetCount++;
    let newId = `w${gridstackWidgetCount}`;
    let defaultOptions = {
        id: newId,
        w: 2,
        h: 2,
        ...options
    }
    grid.addWidget(defaultOptions);
    cards[newId] = new chartCard(`[gs-id="${defaultOptions['id']}"] .grid-stack-item-content`,
        { smpgCardType: "Empty Widget" }
    );
}

/**
 * Toggles the grid layout between edit mode and static (view) mode.
 * Shows/hides the relevant toolbar buttons and updates grid interactivity accordingly.
 */
function toggleLayoutEdit() {
    // The layout is only edited in edit mode
    if (!editingLayout && !reportEditMode) { return; }
    // Widgets are moved and resized in their places
    if (!editingLayout) {
        setMaximizedCard(null);
    }
    editingLayout = !editingLayout;
    EDIT_LAYOUT_BUTTON.classed("w3-hide", editingLayout);
    STOP_EDIT_LAYOUT_BUTTON.classed("w3-hide", !editingLayout);
    ADD_WIDGET_BUTTON.classed("w3-hide", !editingLayout);
    SORT_LAYOUT_BUTTON.classed("w3-hide", !editingLayout)
    grid.setStatic(!editingLayout);
}

/**
 * Switches between edit mode, which shows the controls that change the report, and reader mode,
 * which hides them: widget type selection, layout export and editing, the map's control panel,
 * and Rich Text editing (texts show in view mode, keeping their own mode for edit mode).
 * @param {boolean} state - True for edit mode, false for reader mode.
 */
function setReportEditMode(state) {
    if (state === reportEditMode) { return; }
    if (!state && editingLayout) {
        toggleLayoutEdit();
    }
    const editors = Object.values(cards).map((card) => card.cardElements["editor"]).filter(Boolean);
    // Typed text is kept before the editors leave edit mode
    for (const editor of editors) {
        editor.saveTemplate();
    }
    reportEditMode = state;
    reportEditModeUsed = reportEditModeUsed || state;
    BODY.classList.toggle(REPORT_READER_MODE_CLASS, !state);
    SWITCH_TO_EDIT_MODE_BUTTON.classed(HIDE_CLASS, state || !reportEditModeUsed);
    for (const card of Object.values(cards)) {
        card.graphTypeSelectContent.classed("w3-show", false);
    }
    for (const editor of editors) {
        editor.render();
    }
    // Cards with a hidden header change height
    handleResize();
}

/**
 * Triggers a browser download of the given content as a file, with no server involved.
 * Works from a file:// page since it only uses a Blob object URL and a hidden <a download>.
 * @param {string} filename - The suggested file name for the download.
 * @param {string|Blob} content - The file content, either as text or an already-built Blob.
 * @param {string} [mimeType] - MIME type to use when content is a plain string. Ignored if
 *   content is already a Blob.
 */
function downloadFile(filename, content, mimeType = "text/plain") {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Builds a layout.js-shaped object from the currently loaded grid and widgets: each widget's
 * live properties (from chartCard.getProperties()) plus its current gridstack position/size,
 * converted back to layout.js units (the inverse of parseGridstackItems()), and the unloaded
 * widgets with their saved state.
 * @returns {Object} An object in the same shape as data/layout.js's `layout` variable.
 */
function buildLayoutExport() {
    let toExport = {
        general: layout.general,
        gridstackWidgets: {}
    };
    let currentGridstackWidgets = Object.fromEntries(grid.save(false, false).map((value, index, array) => {
            const {id, ...obj} = value; // remove the id property from the object
        return [id, obj];
    }));
    for (const id in currentGridstackWidgets) {
        const savedItem = currentGridstackWidgets[id];
        toExport.gridstackWidgets[id] = {
            smpgOpts: {
                ...cards[id].getProperties()
            },
            gridstackOpts: gridstackItemToLayoutOpts(savedItem),
        }
    }
    // Unloaded widgets keep their saved state
    for (const [id, entry] of Object.entries(layout.gridstackWidgets)) {
        if (entry.unloaded) {
            toExport.gridstackWidgets[id] = entry;
        }
    }
    return toExport;
}

/**
 * Renders the current widget layout as the text content of a layout.js file.
 * @returns {string} Source text in the same "var layout = {...};" form as data/layout.js.
 */
function buildLayoutJsContent() {
    return `var layout = ${JSON.stringify(buildLayoutExport(), null, 4)};\n`;
}

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
 * Opens the Save layout window: the path of this report's layout.js, and the current layout to
 * download or copy into it. Browsers can't write the file themselves.
 */
function openSaveLayoutDialog() {
    saveLayoutContent = buildLayoutJsContent();
    const path = getLayoutFilePath();
    document.getElementById("saveLayoutPath").textContent = path ?? "";
    document.getElementById("saveLayoutPathRow").classList.toggle(HIDE_CLASS, path === null);
    document.getElementById("saveLayoutNoPath").classList.toggle(HIDE_CLASS, path !== null);
    document.getElementById("saveLayoutStatus").textContent = "";
    document.getElementById("saveLayoutFallbackText").classList.add(HIDE_CLASS);
    document.getElementById("saveLayoutModal").style.display = "block";
}

/**
 * Closes the Save layout window.
 */
function closeSaveLayoutDialog() {
    document.getElementById("saveLayoutModal").style.display = "none";
}

/**
 * Connects the Save layout window's buttons, and closes it with Esc or a click outside it.
 */
function setupSaveLayoutDialog() {
    const modal = document.getElementById("saveLayoutModal");
    document.getElementById("saveLayoutCopyPathButton").addEventListener("click",
        () => copySaveLayoutText(getLayoutFilePath(), "Path"));
    document.getElementById("saveLayoutDownloadButton").addEventListener("click", () => {
        downloadFile("layout.js", saveLayoutContent, "text/javascript");
        document.getElementById("saveLayoutFallbackText").classList.add(HIDE_CLASS);
        document.getElementById("saveLayoutStatus").textContent = "layout.js downloaded.";
    });
    document.getElementById("saveLayoutCopyLayoutButton").addEventListener("click",
        () => copySaveLayoutText(saveLayoutContent, "Layout"));
    closeDialogOnEscOrOutsideClick(modal, closeSaveLayoutDialog);
}

/**
 * Closes a window (a w3-modal) with Esc, or with a click outside its content.
 * @param {HTMLElement} modal - The w3-modal element.
 * @param {Function} close - Closes it.
 */
function closeDialogOnEscOrOutsideClick(modal, close) {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) { close(); }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "block") {
            close();
            // So the same Esc doesn't also restore a maximized widget
            event.preventDefault();
        }
    });
}

/**
 * Maximizes a card to fill the report's content area, or restores the maximized one. The card
 * stays where it is in the page (moving it would reload a Rich Text editor): only its gridstack
 * item is placed over the content area (see .widget-maximized in style.css).
 * @param {chartCard|null} card - The card to maximize, or null to restore.
 */
function setMaximizedCard(card) {
    const previous = maximizedCard;
    if (card === previous) { return; }
    maximizedCard = card;
    for (const changed of [previous, card]) {
        if (!changed) { continue; }
        changed.elementContainer.node().parentElement.classList.toggle("widget-maximized", changed === card);
        changed.refreshMaximizeButton();
    }
    BODY.classList.toggle("widget-maximized-shown", card !== null);
    // Also places the maximized card, then resizes the charts and maps
    handleResize();
}

/**
 * Sets the maximized card's place: the content area, inside its padding.
 */
function updateMaximizedWidget() {
    if (!maximizedCard) { return; }
    const body = document.getElementById("contentBody");
    const box = body.getBoundingClientRect();
    const style = getComputedStyle(body);
    const [top, right, bottom, left] = ["Top", "Right", "Bottom", "Left"]
        .map((side) => parseFloat(style[`padding${side}`]));
    const item = maximizedCard.elementContainer.node().parentElement;
    item.style.setProperty("--maximized-top", `${box.top + body.clientTop + top}px`);
    item.style.setProperty("--maximized-left", `${box.left + body.clientLeft + left}px`);
    item.style.setProperty("--maximized-width", `${body.clientWidth - left - right}px`);
    item.style.setProperty("--maximized-height", `${body.clientHeight - top - bottom}px`);
}

/**
 * Restores the maximized card with Esc.
 */
function setupMaximizedCardEscape() {
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !event.defaultPrevented && maximizedCard) {
            setMaximizedCard(null);
        }
    });
}

/**
 * Returns the current period: the last one with data in the current season (forecast periods
 * excluded), e.g. "Mar-2".
 * @returns {string}
 */
function getCurrentPeriodId() {
    // currentLength is -1 when the whole year has data
    const length = currentLength >= 0 ? currentLength : datasetProperties.sub_season_ids.length;
    return datasetProperties.sub_season_ids[Math.max(length, 1) - 1];
}

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
    d3.select("#aboutDataTable").selectAll("tr")
        .data(getAboutDataRows())
        .join("tr")
        .selectAll("td")
            .data(row => row)
            .join("td")
            .text(d => d);
    document.getElementById("aboutDataModal").style.display = "block";
}

/**
 * Closes the About this data window.
 */
function closeAboutDataDialog() {
    document.getElementById("aboutDataModal").style.display = "none";
}

/**
 * Closes the About this data window with Esc or a click outside it.
 */
function setupAboutDataDialog() {
    closeDialogOnEscOrOutsideClick(document.getElementById("aboutDataModal"), closeAboutDataDialog);
}
