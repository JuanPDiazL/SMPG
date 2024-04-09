function getDataAssessmentCD(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    const currentSeason = getLast(data['Current Season Accumulation']);
    const ltaUptoCurrentSeason = data['LTA'][data['Current Season Accumulation'].length-1]
    const selectedLtaUptoCurrentSeason = selectedData['LTA'][data['Current Season Accumulation'].length-1]
    let tableData = [
        ['Total C.Dk.', currentSeason],
        ['LTA C.Dk.', selectedLtaUptoCurrentSeason, ltaUptoCurrentSeason],
        ['C.Dk. LTA Pct', (currentSeason/selectedLtaUptoCurrentSeason) * 100, (currentSeason/ltaUptoCurrentSeason) * 100],
    ];
    return tableData;
}

function getDataSeasonalAnalysis(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    let tableData = [
        ['LTM', getLast(selectedData['LTA']), getLast(data['LTA'])],
        ['St. Dev.', getLast(selectedData['St. Dev.']), getLast(data['St. Dev.'])],
    ];
    return tableData;
}
function getDataProjectionEoS(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    const ensembleLTM = getLast(data['E. LTM']);
    const lta = getLast(data['LTA']);
    const selectedEnsembleLTM = getLast(selectedData['E. LTM']);
    const selectedLta = getLast(selectedData['LTA']);
    let tableData = [
        ['E. LTM', selectedEnsembleLTM, ensembleLTM],
        ['LTA', selectedLta, lta],
        ['E. LTM LTA Pct.', (selectedEnsembleLTM/selectedLta) * 100, (ensembleLTM/lta) * 100],
    ];
    return tableData;
}
function getDataProbabilityEoS(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    let tableData = [
        ['Ab. Normal', selectedData['E. Probabilities'][2] * 100, data['E. Probabilities'][2] * 100],
        ['Normal', selectedData['E. Probabilities'][1] * 100, data['E. Probabilities'][1] * 100],
        ['Be. Normal', selectedData['E. Probabilities'][0] * 100, data['E. Probabilities'][0] * 100],
    ];
    return tableData;
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