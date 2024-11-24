function getDataAssessmentCD(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    const currentIndex = data['Current Season Accumulation'].length-1;
    let tableData = [
        ['Total C. Dk.', getLast(data['Current Season Accumulation']), getLast(data['Current Season Accumulation'])],
        ['LTA C. Dk.', selectedData['LTA'][currentIndex], data['LTA'][currentIndex]],
        ['C. Dk./LTA Pct.', getLast(selectedData['C. Dk./LTA']) * 100, getLast(data['C. Dk./LTA']) * 100],
    ];
    return tableData;
}

function getDataSeasonalAnalysis(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    let tableData = [
        ['LTA', getLast(selectedData['LTA']), getLast(data['LTA'])],
        ['St. Dev.', getLast(selectedData['St. Dev.']), getLast(data['St. Dev.'])],
    ];
    return tableData;
}
function getDataProjectionEoS(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    let tableData = [
        ['Ensemble Med.', getLast(selectedData['Ensemble Med.']), getLast(data['Ensemble Med.'])],
        ['LTA', getLast(selectedData['LTA']), getLast(data['LTA'])],
        ['Ensemble Med./LTA Pct.', getLast(selectedData['Ensemble Med./LTA']) * 100, getLast(data['Ensemble Med./LTA']) * 100],
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

function getPercentileTable(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    let tableData = [
        ['67 Percentile', selectedData['Drought Severity Pctls.'][5], data['Drought Severity Pctls.'][5]],
        ['33 Percentile', selectedData['Drought Severity Pctls.'][4], data['Drought Severity Pctls.'][4]],
        ['11 Percentile', selectedData['Drought Severity Pctls.'][2], data['Drought Severity Pctls.'][2]],
    ];
    return tableData;
}
function getCurrentSeasonTable(placeStats, selectedYearsStats, place) {
    let data = placeStats[place];
    let selectedData = selectedYearsStats[place];
    let tableData = [
        ['Current Season Pctl.', selectedData['Current Season Pctl.'][0], data['Current Season Pctl.'][0]],
    ];
    return tableData;
}

class statsTable {
    constructor(container, title, headers=['Sel. Yrs.', 'Clim.']) {
        this.container = container;
        this.title = title;

        this.table = document.querySelector(container).appendChild(document.createElement('table'));
        this.table.className = 'chart-table w3-table w3-bordered w3-border';
        this.table.innerHTML = `
        <thead>
            <tr><th colspan=3>${this.title}</th></tr>
            <tr><td></td><td>${headers[0]}</td><td>${headers[1]}</td></tr>
        </thead>
        `;
        this.tableBody = this.table.appendChild(document.createElement('tbody'));
        document.querySelector(container).appendChild(this.table);
    }

    update(tableData) {
        this.tableBody.innerHTML = '';
        for (let row of tableData) {
            let tr = this.tableBody.appendChild(document.createElement('tr'));
            let col1 = row[1].toFixed(0);
            let col2 = row[2].toFixed(0);
            if (col1 != col2) {
                tr.innerHTML = `<td>${row[0]}</td><td>${col1}</td><td>${col2}</td>`;
            }
            else {
                tr.innerHTML = `<td>${row[0]}</td><td class="w3-center" colspan=2>${col1}</td>`;
            }
        }
    }
}
