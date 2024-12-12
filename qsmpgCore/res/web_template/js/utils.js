"use strict";
const QSMPG_COOKIE_PREFIX = 'QSMPG_';
const DARKMODE_COOKIE_NAME = `${QSMPG_COOKIE_PREFIX}DARKMODE`;
const MENU_HIDE_STATE_COOKIE_NAME = `${QSMPG_COOKIE_PREFIX}MENU_HIDE_STATE`;

const BODY_ELEMENT = document.body;

const HIDE_CLASS = 'w3-hide';

const categories = {
    '': {'lightgray': () => true},
    'C. Dk./LTA Pct.': {
        '#be6b05': (x) => x <= 20,
        '#f38124': (x) => x > 20 && x <= 40,
        '#fec280': (x) => x > 40 && x <= 60,
        '#ffe69e': (x) => x > 60 && x <= 80,
        '#fff9a3': (x) => x > 80 && x <= 90,
        '#f2f2f2': (x) => x > 90 && x <= 110,
        '#c6eab3': (x) => x > 110 && x <= 120,
        '#56cd94': (x) => x > 120 && x <= 140,
        '#5cc9ea': (x) => x > 140 && x <= 160,
        '#2a83ba': (x) => x > 160,
        'lightgray': () => true
    }, 
    'Ensemble Med./LTA Pct.': {
        '#be6b05': (x) => x <= 20,
        '#f38124': (x) => x > 20 && x <= 40,
        '#fec280': (x) => x > 40 && x <= 60,
        '#ffe69e': (x) => x > 60 && x <= 80,
        '#fff9a3': (x) => x > 80 && x <= 90,
        '#f2f2f2': (x) => x > 90 && x <= 110,
        '#c6eab3': (x) => x > 110 && x <= 120,
        '#56cd94': (x) => x > 120 && x <= 140,
        '#5cc9ea': (x) => x > 140 && x <= 160,
        '#2a83ba': (x) => x > 160,
        'lightgray': () => true
    }, 
    'Probability Below Normal': {
        '#2b83ba': (x) => x >= 0 && x <= 15,
        '#74b7ae': (x) => x >= 15 && x <= 30,
        '#e7f6b8': (x) => x >= 30 && x <= 45,
        '#ffe8a4': (x) => x >= 45 && x <= 60,
        '#feba6e': (x) => x >= 60 && x <= 75,
        '#ed6e43': (x) => x >= 75 && x <= 90,
        '#d7191c': (x) => x >= 90 && x <= 100,
        'lightgray': () => true
    },
    'Probability Between Normal': {
        '#e6e6e6': (x) => x >= 0 && x <= 20,
        '#f0f9e8': (x) => x > 20 && x <= 40,
        '#bae4bc': (x) => x > 40 && x <= 60,
        '#7bccc4': (x) => x > 60 && x <= 80,
        '#43a2ca': (x) => x > 80 && x <= 90,
        '#0868ac': (x) => x > 90 && x <= 100,
        'lightgray': () => true
    }, 
    'Probability Above Normal': {
        '#e6e6e6': (x) => x >= 0 && x <= 20,
        '#f0f9e8': (x) => x > 20 && x <= 40,
        '#bae4bc': (x) => x > 40 && x <= 60,
        '#7bccc4': (x) => x > 60 && x <= 80,
        '#43a2ca': (x) => x > 80 && x <= 90,
        '#0868ac': (x) => x > 90 && x <= 100,
        'lightgray': () => true
    }, 
    'Ensemble Med. Pctl.': {
        '#7e0006': (x) => x >= 0 && x <= 3,
        '#e20b00': (x) => x > 3 && x <= 6,
        '#e35a1a': (x) => x > 6 && x <= 11,
        '#faaf00': (x) => x > 11 && x <= 21,
        '#faff0f': (x) => x > 21 && x <= 33,
        '#f2f2f2': (x) => x > 33 && x <= 67,
        '#a6cee3': (x) => x > 67 && x <= 90,
        '#1f78b4': (x) => x > 90,
        'lightgray': () => true
    },
    'Current Season Pctl.': {
        '#7e0006': (x) => x >= 0 && x <= 3,
        '#e20b00': (x) => x > 3 && x <= 6,
        '#e35a1a': (x) => x > 6 && x <= 11,
        '#faaf00': (x) => x > 11 && x <= 21,
        '#faff0f': (x) => x > 21 && x <= 33,
        '#f2f2f2': (x) => x > 33 && x <= 67,
        '#a6cee3': (x) => x > 67 && x <= 90,
        '#1f78b4': (x) => x > 90,
        'lightgray': () => true
    },
  };
  

function navigateTo(queryParams={}, keepOlpParams=true) {
    const oldParams = keepOlpParams? getHashParamsObject() : {};
    const newParams = {...oldParams, ...queryParams };
    const paramsString = new URLSearchParams(newParams).toString();
    window.location.hash = paramsString;
}

function handleNavigation() {
    const params = getHashParamsObject();
    const mode = params['mode'];
    const place = params['place'];
    let mapRoot = $('#mapRoot');
    let plotsRoot = $('#plotsRoot');
    switch (mode) {
        case "map":
            if (isDeclared('topojson_map')) {
                mapRoot.removeClass(HIDE_CLASS);
                plotsRoot.addClass(HIDE_CLASS);
                break;
            }
        case "plots":
            plotsRoot.removeClass(HIDE_CLASS);
            mapRoot.addClass(HIDE_CLASS);
            break;
        case "test":
            mapRoot.removeClass(HIDE_CLASS);
            plotsRoot.removeClass(HIDE_CLASS);
            break;
        default:
            if (isDeclared('topojson_map')) {
                mapRoot.removeClass(HIDE_CLASS);
                plotsRoot.addClass(HIDE_CLASS);
                break;
            } else {
                mapRoot.addClass(HIDE_CLASS);
                plotsRoot.removeClass(HIDE_CLASS);
            }
            break;
    }
    

    let selectedPlace = "";
    if (Object.values(datasetProperties["place_ids"]).includes(place)){
        selectedPlace = place;
    }
    else{
        selectedPlace = firstPlaceKey
    }
    updateDocument(selectedPlace);
    previousSelectionElement = sidebarElements[selectedPlace];
    placeUnder(table4.table, table3.table);
    placeUnder(table6.table, table5.table);
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

function goToMap() {
    navigateTo({"mode": "map"}, false);
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


function getLast(arr) {
    return arr[arr.length - 1];
}

function setMenuState(value) {
    setCookie(MENU_HIDE_STATE_COOKIE_NAME, value);
    if (value === "true") {
        BODY_ELEMENT.classList.add('sidebar-closed');
    } else {
        BODY_ELEMENT.classList.remove('sidebar-closed');
    }
}

function menuToggle() {
    setCookie(MENU_HIDE_STATE_COOKIE_NAME, BODY_ELEMENT.classList.toggle('sidebar-closed'));
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
    const compressed = atob(data);
    const charData = compressed.split('').map(function(x){return x.charCodeAt(0);});
    const binData = new Uint8Array(charData);
    const decompressed = pako.inflate(binData);
    return String.fromCharCode.apply(null, new Uint16Array(decompressed));
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

function updateDocument(place) {
    document.getElementById('contentHeaderText').textContent = place;
    const plot2Title = `Current Rainfall Status (${datasetProperties.current_season_id}). Climatology: [${datasetProperties.climatology_year_ids[0]}, ${getLast(datasetProperties.climatology_year_ids)}]`;
    const plot4Title = `Seasonal Rainfall Accumulation Up to Current Dekad for ${place}`;
    bb1.update(place);
    bb2.update(place);
    bb3.update(place);
    bb4.update(place);
    table1.update(getDataAssessmentCD(place));
    table2.update(getDataSeasonalAnalysis(place));
    table3.update(getDataProjectionEoS(place));
    table4.update(getDataProbabilityEoS(place));
    table5.update(getPercentileTable(place));
    table6.update(getCurrentSeasonTable(place));
    document.getElementById('plot2Title').textContent = plot2Title;
    document.getElementById('plot4Title').textContent = plot4Title;

    if(previousSelectionElement != null) {
        previousSelectionElement.classList.remove('selected');
    }
    sidebarElements[place].classList.add('selected');
    $('#contentHeaderText').textContent = place;
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
            navigateTo({"place": place, "mode": "plots"});
        });
        sidebarList.appendChild(listElement);
    }
    return sidebarElements;
}

function updateSelect(node, items) {
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;  // You can set a value attribute if needed
        option.text = item;   // Set the text content of the option
        node.appendChild(option);
    });
}

function categorizeValue(value, bins) {
    for (const [binName, binFunction] of Object.entries(bins)) {
        if (binFunction(value)) {
            return binName;
        }
    }
    return 'Uncategorized';
    
}