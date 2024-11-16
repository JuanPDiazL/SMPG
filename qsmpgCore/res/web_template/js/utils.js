"use strict";
const QSMPG_COOKIE_PREFIX = 'QSMPG_';
const DARKMODE_COOKIE_NAME = `${QSMPG_COOKIE_PREFIX}DARKMODE`;
const MENU_HIDE_STATE_COOKIE_NAME = `${QSMPG_COOKIE_PREFIX}MENU_HIDE_STATE`;

const BODY_ELEMENT = document.body;

const HIDE_CLASS = 'w3-hide';

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
    let firstPlaceKey = datasetProperties['place_ids'][0];
    
    switch (mode) {
        case "map":
            mapRoot.removeClass(HIDE_CLASS);
            plotsRoot.addClass(HIDE_CLASS);
            break;
        case "plots":
            plotsRoot.removeClass(HIDE_CLASS);
            mapRoot.addClass(HIDE_CLASS);
            break;
        case "test":
            mapRoot.removeClass(HIDE_CLASS);
            plotsRoot.removeClass(HIDE_CLASS);
            break;
        default:
            mapRoot.removeClass(HIDE_CLASS);
            plotsRoot.addClass(HIDE_CLASS);
            break;
    }

    let selectedPlace = null;
    if (Object.values(datasetProperties["place_ids"]).includes(params.place)){
        selectedPlace = params.place;
    }
    else{
        selectedPlace = firstPlaceKey
    }
    updateDocument(selectedPlace);
    placeUnder(table4.table, table3.table);
    window.dispatchEvent(new Event('resize'));
    previousSelectionElement = sidebarElements[selectedPlace];
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

function goToMap() {
    navigateTo({"mode": "map"});
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

function overlaySVG(table, gSelector) {
    let position = document.querySelector(gSelector).attributes.transform.value.slice('translate('.length, -1).split(',');
    let xPosition = parseFloat(position[0]);
    table.style.left = `${xPosition + 15}px`;
}

function placeUnder(element, anchor) {
    const bbox = anchor.getBoundingClientRect();
    const xPos = anchor.style.left;
    const yPos = `${bbox.height + 10}px`;

    element.style.left = xPos;
    element.style.top = yPos;
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
    table1.update(getDataAssessmentCD(placeStats, selectedYearsPlaceStats, place));
    table2.update(getDataSeasonalAnalysis(placeStats, selectedYearsPlaceStats, place));
    table3.update(getDataProjectionEoS(placeStats, selectedYearsPlaceStats, place));
    table4.update(getDataProbabilityEoS(placeStats, selectedYearsPlaceStats, place));
    table5.update(getPercentileTable(placeStats, selectedYearsPlaceStats, place));
    document.getElementById('plot2Title').textContent = plot2Title;
    document.getElementById('plot4Title').textContent = plot4Title;

    if(typeof previousSelectionElement !== "undefined" && previousSelectionElement != null) {
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
