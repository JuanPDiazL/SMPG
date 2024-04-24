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
        ['E. LTM', getLast(selectedData['E. LTM']), getLast(data['E. LTM'])],
        ['LTA', getLast(selectedData['LTA']), getLast(data['LTA'])],
        ['E. LTM/LTA Pct.', getLast(selectedData['E. LTM/LTA']) * 100, getLast(data['E. LTM/LTA']) * 100],
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
            if (row[1] != row[2]) {
                tr.innerHTML = `<td>${row[0]}</td><td>${(row[1].toFixed(1))}</td><td>${row[2].toFixed(1)}</td>`;
            }
            else {
                tr.innerHTML = `<td>${row[0]}</td><td class="w3-center" colspan=2>${row[1].toFixed(1)}</td>`;
            }
        }
    }
}
