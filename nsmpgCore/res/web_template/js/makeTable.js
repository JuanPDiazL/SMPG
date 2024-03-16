function getDataAssessmentCD(placeStats, place) {
    let data = placeStats[place];
    let selectedData = [
        ['Total C.Dk.', 0, 0],
        ['LTA C.Dk.', 0, data['LTA'][data['Current Season'].length-1]],
        ['LTA C.Dk. Pctl.', 0, 0],
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
    let selectedData = [
        ['E. LTM', 0, getLast(data['E. LTM'])],
        ['LTA', 0, getLast(data['LTA'])],
        ['E. LTM Pctl.', 0, 0],
    ];
    return selectedData;
}
function getDataProbabilityEoS(placeStats, place) {
    let data = placeStats[place];
    let selectedData = [
        ['Ab. Normal', 0, 0],
        ['Normal', 0, 0],
        ['Be. Normal', 0, 0],
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