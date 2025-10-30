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

const UNCAT_COLOR = '#aaaf';
const categories = {
    '': { 'Uncategorized': {color:UNCAT_COLOR, 'function': () => true} },
    'C. Dk./LTA Pct.': {
        '0-19': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-109': { 'color': '#f2f2f2', 'function': (x) => x >= 90 && x < 110 },
        '110-119': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-139': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-159': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'C. Dk.+Forecast/LTA Pct.': {
        '0-19': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-109': { 'color': '#f2f2f2', 'function': (x) => x >= 90 && x < 110 },
        '110-119': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-139': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-159': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Ensemble Med./LTA Pct.': {
        '0-19': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-109': { 'color': '#f2f2f2', 'function': (x) => x >= 90 && x < 110 },
        '110-119': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-139': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-159': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Probability Below Normal': {
        '0-14': { 'color': '#2b83ba', 'function': (x) => x >= 0 && x < 15 },
        '15-29': { 'color': '#74b7ae', 'function': (x) => x >= 15 && x < 30 },
        '30-44': { 'color': '#e7f6b8', 'function': (x) => x >= 30 && x < 45 },
        '45-59': { 'color': '#ffe8a4', 'function': (x) => x >= 45 && x < 60 },
        '60-74': { 'color': '#feba6e', 'function': (x) => x >= 60 && x < 75 },
        '75-89': { 'color': '#ed6e43', 'function': (x) => x >= 75 && x < 90 },
        '90-100': { 'color': '#d7191c', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability of Normal': {
        '0-19': { 'color': '#e6e6e6', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Above Normal': {
        '0-19': { 'color': '#e6e6e6', 'function': (x) => x >= 0 && x < 20 },
        '20-39': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-59': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-79': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-89': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Ensemble Med. Pctl.': {
        '0-2': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-5': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-10': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-20': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-32': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-66': { 'color': '#f2f2f2', 'function': (x) => x >= 33 && x < 67 },
        '67-89': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
        '≥90': { 'color': '#1f78b4', 'function': (x) => x >= 90 },
    },
    'Current Season Pctl.': {
        '0-2': { 'color': '#7e0006', 'function': (x) => x >= 0 && x < 3 },
        '3-5': { 'color': '#e20b00', 'function': (x) => x >= 3 && x < 6 },
        '6-10': { 'color': '#e35a1a', 'function': (x) => x >= 6 && x < 11 },
        '11-20': { 'color': '#faaf00', 'function': (x) => x >= 11 && x < 21 },
        '21-32': { 'color': '#faff0f', 'function': (x) => x >= 21 && x < 33 },
        '33-66': { 'color': '#f2f2f2', 'function': (x) => x >= 33 && x < 67 },
        '67-89': { 'color': '#a6cee3', 'function': (x) => x >= 67 && x < 90 },
        '≥90': { 'color': '#1f78b4', 'function': (x) => x >= 90 },
    },
    'Start of Season': {
        'No Start': { 'color': '#FFF77D', 'function': (x) => x === 'No Start' },
        'Possible St.': { 'color': '#DFD75D', 'function': (x) => x === 'Possible Start' },
        '≤Feb-1': { 'color': '#6E00C9', 'function': (x) => x === '≤Feb-1' },
        'Feb-2': { 'color': '#BF4FE0', 'function': (x) => x === 'Feb-2' },
        'Feb-3': { 'color': '#E3ADF5', 'function': (x) => x === 'Feb-3' },
        'Mar-1': { 'color': '#0094AD', 'function': (x) => x === 'Mar-1' },
        'Mar-2': { 'color': '#21D6FF', 'function': (x) => x === 'Mar-2' },
        'Mar-3': { 'color': '#8CF2FF', 'function': (x) => x === 'Mar-3' },
        'Apr-1': { 'color': '#00BD2E', 'function': (x) => x === 'Apr-1' },
        'Apr-2': { 'color': '#A1FF96', 'function': (x) => x === 'Apr-2' },
        'Apr-3': { 'color': '#A3FFCC', 'function': (x) => x === 'Apr-3' },
        'May-1': { 'color': '#F07500', 'function': (x) => x === 'May-1' },
        'May-2': { 'color': '#FF9126', 'function': (x) => x === 'May-2' },
        'May-3': { 'color': '#FFB8AB', 'function': (x) => x === 'May-3' },
        'Jun-1': { 'color': '#004DA8', 'function': (x) => x === 'Jun-1' },
        'Jun-2': { 'color': '#005CE6', 'function': (x) => x === 'Jun-2' },
        'Jun-3': { 'color': '#0070FF', 'function': (x) => x === 'Jun-3' },
        'Jul-1': { 'color': '#F7E8CC', 'function': (x) => x === 'Jul-1' },
        'Jul-2': { 'color': '#E6C996', 'function': (x) => x === 'Jul-2' },
        'Jul-3': { 'color': '#CFA836', 'function': (x) => x === 'Jul-3' },
        '≥Aug-1': { 'color': '#966300', 'function': (x) => x === '≥Aug-1' },
    },
    'Start of Season Anomaly': {
        'Yet to Start': { 'color': '#FFF77D', 'function': (x) => x === 'Yet to Start'},
        '≥4 Dk. Early': { 'color': '#004280', 'function': (x) => x === '≥4 Dekads Early' },
        '3 Dk. Early': { 'color': '#0073F0', 'function': (x) => x === '3 Dekads Early' },
        '2 Dk. Early': { 'color': '#008FF5', 'function': (x) => x === '2 Dekads Early' },
        '1 Dk. Early': { 'color': '#00A6F5', 'function': (x) => x === '1 Dekads Early' },
        'Average': { 'color': '#CCCCCC', 'function': (x) => x === 'Average' },
        '1 Dk. Late': { 'color': '#FFD4E6', 'function': (x) => x === '1 Dekads Late' },
        '2 Dk. Late': { 'color': '#FFC78F', 'function': (x) => x === '2 Dekads Late' },
        '3 Dk. Late': { 'color': '#FF734A', 'function': (x) => x === '3 Dekads Late' },
        '≥4 Dk. Late': { 'color': '#BA0070', 'function': (x) => x === '≥4 Dekads Late' },
    },
};

function navigateTo(queryParams={}, keepOlpParams=true) {
    const oldParams = keepOlpParams? getHashParamsObject() : {};
    const newParams = {...oldParams, ...queryParams };
    const paramsString = new URLSearchParams(newParams).toString();
    window.location.hash = paramsString;
}

function handleNavigation(event) {
    const oldUrl = event.oldUrl;
    const params = getHashParamsObject();
    const mode = params['mode'];
    const place = params['place'];
    let mapRoot = $('#mapRoot');
    let plotsRoot = $('#plotsRoot');
    let isViewMap = false;
    switch (mode) {
        case "map":
            if (hasMap) {
                isViewMap = true;
                break;
            }
        case "plots":
            // isViewMap = false;
            break;
        default:
            if (hasMap) {
                isViewMap = true;
                break;
            } else {
                // isViewMap = false;
            }
            break;
    }
    
    if(isViewMap) {
        HEADER.textContent = `Dataset: ${datasetProperties.dataset_name}, Stat: ${colorNode.value ? colorNode.value : "None"}`;
        mapRoot.removeClass(HIDE_CLASS);
        plotsRoot.addClass(HIDE_CLASS);
    } else {
        let selectedPlace = "";
        if (Object.values(datasetProperties["place_ids"]).includes(place)){
            selectedPlace = place;
        }
        else{
            showModal(`There is no data for ${place}.<br>Please check for a possible mismatch between the dataset and the selected target field from the shapefile.<br>Selected Region ID: ${place}<br>Target Field: ${parameters.target_id_field}`);
            return;
        }
        HEADER.textContent = `Region ID: ${place}. Current Year: ${datasetProperties.current_season_id}. Monitoring Season: [${datasetProperties.sub_season_monitoring_ids[0]}, ${getLast(datasetProperties.sub_season_monitoring_ids)}]`;
        mapRoot.addClass(HIDE_CLASS);
        plotsRoot.removeClass(HIDE_CLASS);

        updateDocument(selectedPlace);
        previousSelectionElement = sidebarElements[selectedPlace];
        placeUnder(table4.table, table3.table);
        placeUnder(table6.table, table5.table);
    }
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
        BODY.classList.add('sidebar-closed');
    } else {
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

function updateDocument(place) {
    const plot1Title = `Seasonal Accumulations`;
    const plot2Title = `Current Year Status: ${datasetProperties.current_season_id}. Climatology: [${datasetProperties.climatology_year_ids[0]}, ${getLast(datasetProperties.climatology_year_ids)}]`;
    const plot3Title = `Ensemble`;
    const plot4Title = `Seasonal Accumulation Percentiles`;
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
    document.getElementById('plot1Title').textContent = plot1Title;
    document.getElementById('plot2Title').textContent = plot2Title;
    document.getElementById('plot3Title').textContent = plot3Title;
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