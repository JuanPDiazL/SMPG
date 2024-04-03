function getDataAssessmentCD(placeStats, place) {
    let data = placeStats[place];
    const currentSeason = getLast(data['Current Season Accumulation']);
    const ltaUptoCurrentSeason = data['LTA'][data['Current Season Accumulation'].length-1]
    let selectedData = [
        ['Total C.Dk.', 0, currentSeason],
        ['LTA C.Dk.', 0, ltaUptoCurrentSeason],
        ['C.Dk./LTA', 0, (currentSeason/ltaUptoCurrentSeason) * 100],
    ];
    return selectedData;
}

function getDataSeasonalAnalysis(placeStats, place) {
    let data = placeStats[place];
    let selectedData = [
        ['LTM', 0, getLast(data['LTA'])],
        ['St. Dev.', 0, getLast(data['St. Dev.'])],
    ];
    return selectedData;
}
function getDataProjectionEoS(placeStats, place) {
    let data = placeStats[place];
    const ensembleLTM = getLast(data['E. LTM']);
    const lta = getLast(data['LTA']);
    let selectedData = [
        ['E. LTM', 0, ensembleLTM],
        ['LTA', 0, lta],
        ['E. LTM/LTA', 0, (ensembleLTM/lta) * 100],
    ];
    return selectedData;
}
function getDataProbabilityEoS(placeStats, place) {
    let data = placeStats[place];
    let selectedData = [
        ['Ab. Normal', 0, data['E. Probabilities'][2] * 100],
        ['Normal', 0, data['E. Probabilities'][1] * 100],
        ['Be. Normal', 0, data['E. Probabilities'][0] * 100],
    ];
    return selectedData;
}

function makeTable(container, selectedData, title) {
    const table = document.createElement('table');
    table.className = 'chart-table w3-table w3-striped w3-bordered w3-border';

    const thead = document.createElement('thead');
    const thTitle = document.createElement('th');
    thTitle.textContent = title;
    thTitle.colSpan = 3;
    thead.appendChild(thTitle);
    const trTitles = document.createElement('thead');
    const thBlank = document.createElement('td');
    const thSelYrs = document.createElement('td');
    const thClim = document.createElement('td');
    thSelYrs.textContent = 'Sel. Yrs.';
    thClim.textContent = 'Clim.';
    trTitles.append(thBlank, thSelYrs, thClim);
    table.append(thead, trTitles);

    for (const data of selectedData) {
        const tr = document.createElement('tr');
        const tdPropName = document.createElement('td');
        const tdPropSelectedYearsValue = document.createElement('td');
        const tdPropClimatologyValue = document.createElement('td');

        tdPropName.textContent = data[0];
        tdPropClimatologyValue.textContent = Math.round(data[1]);
        tdPropSelectedYearsValue.textContent = Math.round(data[2]);
        tr.append(tdPropName, tdPropClimatologyValue, tdPropSelectedYearsValue);
        table.appendChild(tr);
    }
    document.querySelector(container).appendChild(table);
    return table;
}