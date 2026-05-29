"use strict";
const SMPG_COOKIE_PREFIX = 'SMPG_';
const DARKMODE_COOKIE_NAME = `${SMPG_COOKIE_PREFIX}DARKMODE`;
const MENU_HIDE_STATE_COOKIE_NAME = `${SMPG_COOKIE_PREFIX}MENU_HIDE_STATE`;

const SHORT_NAMES = {
    "Pentad": "Ptd.",
    "Dekad": "Dek.",
    "Month": "Mth.",
};

const HIDE_CLASS = 'w3-hide';

function navigateTo(queryParams={}, keepOlpParams=true) {
    const oldParams = keepOlpParams? getHashParamsObject() : {};
    const newParams = {...oldParams, ...queryParams };
    const paramsString = new URLSearchParams(newParams).toString();
    window.location.hash = paramsString;
}

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

function getHashParams(param=null) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the leading '#'
    if (param) {
        return hashParams.get(param);
     } else {
        return hashParams;
     }
}
function getHashParamsObject() {
    const urlSearchParams = getHashParams();
    return Object.fromEntries(urlSearchParams.entries());
}

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

function setCookie(name, value) {
    var date = new Date();
    date.setDate(date.getDate() + 1); // expire in 1 day

    document.cookie = `${name}=${value}; expires=${date.toUTCString()}; SameSite=Strict`;
}

function isDeclared(variableName) {
    return typeof window[variableName] !== "undefined";   
}

function setDarkMode(value) {
    setCookie(DARKMODE_COOKIE_NAME, value);
    if (value === "true") {
        document.body.classList.add('darkmode');
    } else {
        document.body.classList.remove('darkmode');
    }
}

function toggleDarkMode() {
    setCookie(DARKMODE_COOKIE_NAME, document.body.classList.toggle('darkmode'));
}

function zip(...arrays) {
  const minLength = Math.min(...arrays.map(arr => arr.length));
  return Array.from({ length: minLength }, (_, i) => 
    arrays.map(arr => arr[i])
  );
}

function getLast(arr) {
    return arr[arr.length - 1];
}

function setMenuState(value) {
    setCookie(MENU_HIDE_STATE_COOKIE_NAME, value);
    if (!value || value === "true") {
        BODY.classList.add('sidebar-closed');
    } else if (value === "false") {
        BODY.classList.remove('sidebar-closed');
    }
}

function menuToggle() {
    setCookie(MENU_HIDE_STATE_COOKIE_NAME, BODY.classList.toggle('sidebar-closed'));
    window.dispatchEvent(new Event('resize'));
  }

function placeUnder(element, anchor) {
    const bbox = anchor.getBoundingClientRect();
    const xPos = anchor.style.left;
    const yPos = `${bbox.height + 10}px`;

    element.style.left = xPos;
    element.style.top = yPos;
}

function objectMap(obj, fn) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value], index) => [key, fn(value, key, index)])
    );
}

function decompress(data) {
    const compressedData = atob(data);
    const compressedDataString = compressedData.split('').map(function(x){return x.charCodeAt(0);});
    const compressedDataBin = new Uint8Array(compressedDataString);
    const decompressedString = pako.inflate(compressedDataBin, { to: 'string'});
    return decompressedString;
}

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

function parseObjectCsv(obj) {
    return objectMap(obj, csvParse);
}

function parseRowsObjectCsv(obj) {
    return objectMap(JSON.parse(obj), csvParseRows);
}

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

function confirmSearch(event) {
    if(event.key === 'Enter') {
        const placeList = document.getElementById("placeList");
        const selectedPlace = placeList.querySelector('.place-list-element:not(.place-hidden)');
        selectedPlace.firstChild.click();
        console.log(selectedPlace, 'clicked');
    }
}

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

function categorizeValue(value, bins) {
    for (const [binName, binData] of Object.entries(bins)) {
        const binFunction = binData['function'];
        if (binFunction(value)) {
            return binName;
        }
    }
    return 'Uncategorized';
    
}

function getColors(bins) {
    return Object.values(bins).map(bin => bin.color);
}

function showModal(message) {
    MODAL.style.display = "block";
    MODAL_HEADER.textContent = "Warning";
    MODAL_TEXT.innerHTML = message;
}

function closeModal() {
    MODAL.style.display = "none";
    MODAL_HEADER.textContent = "";
    MODAL_TEXT.innerHTML = "";
}

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

function toggleLayoutEdit() {
    editingLayout = !editingLayout;
    EDIT_LAYOUT_BUTTON.classed("w3-hide", editingLayout);
    STOP_EDIT_LAYOUT_BUTTON.classed("w3-hide", !editingLayout);
    ADD_WIDGET_BUTTON.classed("w3-hide", !editingLayout);
    SORT_LAYOUT_BUTTON.classed("w3-hide", !editingLayout)
    grid.setStatic(!editingLayout);
}