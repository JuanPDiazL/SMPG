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
 * and highlights the corresponding sidebar element. Shows a warning modal if the place is invalid.
 * @param {Object} event - The navigation event containing the oldUrl property.
 */
function handleNavigation(event) {
    const oldUrl = event.oldUrl;
    const params = getHashParamsObject();
    const place = params['place'];

    if (Object.values(datasetProperties["place_ids"]).includes(place)){
        currentDataIndex = place;
    }
    else{
        showModal(`There is no data for ${place}.<br>Please check for a possible mismatch between the dataset and the selected target field from the shapefile.<br>Selected Region ID: ${place}<br>Target Field: ${parameters.target_id_field}`);
        return;
    }
    HEADER.text(`Region ID: ${place}. Current Year: ${datasetProperties.current_season_id}. Monitoring Season: [${datasetProperties.sub_season_monitoring_ids[0]}, ${getLast(datasetProperties.sub_season_monitoring_ids)}], Dataset: ${datasetProperties.dataset_name}`);

    for (const card of cards) {
        card.update(currentDataIndex);
    }

    if(previousSelectionElement != null) {
        previousSelectionElement.classList.remove('selected');
    }
    sidebarElements[currentDataIndex].classList.add('selected');

    previousSelectionElement = sidebarElements[currentDataIndex];
}

/**
 * Handles window resize events with debouncing. Recalculates content height,
 * updates grid cell dimensions, and resizes all map and plot card elements.
 * @param {Event} event - The resize event (unused; debounce is handled internally).
 */
function handleResize(event) {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        contentHeight = Math.max(900, window.innerHeight - d3.select("#contentHeader").node().getBoundingClientRect().height);
        grid.cellHeight(contentHeight/GS_V_RES);
        for (const card of cards) {
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
function add_widget(options) {
    gridstackWidgetCount++;
    let defaultOptions = {
        smpgCardType: "Disabled",

        id: `item${gridstackWidgetCount}`,
        w: 2,
        h: 2,
        ...options
    }
    grid.addWidget(defaultOptions);
    cards.push(new chartCard(`[gs-id="${defaultOptions['id']}"] .grid-stack-item-content`,
        defaultOptions['smpgCardType']),)
}

/**
 * Toggles the grid layout between edit mode and static (view) mode.
 * Shows/hides the relevant toolbar buttons and updates grid interactivity accordingly.
 */
function toggleLayoutEdit() {
    editingLayout = !editingLayout;
    EDIT_LAYOUT_BUTTON.classed("w3-hide", editingLayout);
    STOP_EDIT_LAYOUT_BUTTON.classed("w3-hide", !editingLayout);
    ADD_WIDGET_BUTTON.classed("w3-hide", !editingLayout);
    SORT_LAYOUT_BUTTON.classed("w3-hide", !editingLayout)
    grid.setStatic(!editingLayout);
}