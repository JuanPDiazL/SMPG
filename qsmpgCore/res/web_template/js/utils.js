
function getLast(arr) {
    return arr[arr.length - 1];
}

function w3_open() {
    document.getElementById("leftSidebar").style.display = "block";
    document.getElementById("myOverlay").style.display = "block";
}

function w3_close() {
    document.getElementById("leftSidebar").style.display = "none";
    document.getElementById("myOverlay").style.display = "none";
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
}

function makeSelectionMenu(data) {
    const sidebarList = document.getElementById('placeList');
    for (const place of data.toSorted()) {
        const listElement = document.createElement('li');
        listElement.className = 'place-list-element';
        const placeLink = document.createElement('a');
        listElement.appendChild(placeLink);
        sidebarElements[place] = placeLink;
        placeLink.id = place;
        placeLink.className = 'w3-bar-item w3-button';
        placeLink.innerHTML = place;
        placeLink.addEventListener('click', function () {
            updateDocument(place);
            placeLink.classList.add('selected');
            if (previousSelectionElement) {
                previousSelectionElement.classList.remove('selected');
            }
            previousSelectionElement = placeLink;
        });
        sidebarList.appendChild(listElement);
    }
}
