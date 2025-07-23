function getDataAssessmentCD(index) {
    let tableData = [
        [`Total C. ${SHORT_NAMES[period_unit]}`, place_general_stats[index]['Current Season Total'], null],
        [`LTA C. ${SHORT_NAMES[period_unit]}`, selected_seasons_general_stats[index]['LTA up to Current Season'], seasonal_general_stats[index]['LTA up to Current Season']],
        [`C. ${SHORT_NAMES[period_unit]}/LTA Pct.`, selected_seasons_general_stats[index]['C. Dk./LTA Pct.'], seasonal_general_stats[index]['C. Dk./LTA Pct.']],
    ];
    return tableData;
}

function getDataSeasonalAnalysis(index) {
    let tableData = [
        ['LTA', selected_seasons_general_stats[index]['LTA'], seasonal_general_stats[index]['LTA']],
        ['St. Dev.', selected_seasons_general_stats[index]['St. Dev.'], seasonal_general_stats[index]['St. Dev.']],
    ];
    if (hasSos) {
        tableData.push(['SOS', place_general_stats[index]['Start of Season Class'], null]);
        tableData.push(['SOS Anomaly', place_general_stats[index]['Start of Season Anomaly Class'], null]);
    }
    return tableData;
}
function getDataProjectionEoS(index) {
    let tableData = [
        ['Ensemble Med.', selected_seasons_general_stats[index]['Ensemble Med.'], seasonal_general_stats[index]['Ensemble Med.']],
        ['LTA', selected_seasons_general_stats[index]['LTA'], seasonal_general_stats[index]['LTA']],
        ['Ensemble Med./LTA Pct.', selected_seasons_general_stats[index]['Ensemble Med./LTA Pct.'], seasonal_general_stats[index]['Ensemble Med./LTA Pct.']],
        ['Ensemble Med. Pctl.', selected_seasons_general_stats[index]['Ensemble Med. Pctl.'], selected_seasons_general_stats[index]['Ensemble Med. Pctl.']],
    ];
    return tableData;
}
function getDataProbabilityEoS(index) {
    let tableData = [
        ['Above Normal', selected_seasons_general_stats[index]['E. Prob. Above Normal Pct.'], seasonal_general_stats[index]['E. Prob. Above Normal Pct.']],
        ['Normal', selected_seasons_general_stats[index]['E. Prob. of Normal Pct.'], seasonal_general_stats[index]['E. Prob. of Normal Pct.']],
        ['Below Normal', selected_seasons_general_stats[index]['E. Prob. Below Normal Pct.'], seasonal_general_stats[index]['E. Prob. Below Normal Pct.']],
    ];
    return tableData;
}

function getPercentileTable(index) {
    let tableData = [
        ['67 Percentile', place_general_stats[index]['Seasonal 67 Pctl.'], null],
        ['33 Percentile', place_general_stats[index]['Seasonal 33 Pctl.'], null],
        ['11 Percentile', place_general_stats[index]['Seasonal 11 Pctl.'], null],
    ];
    return tableData;
}
function getCurrentSeasonTable(index) {
    let tableData = [
        ['Current Season Pctl.', place_general_stats[index]['Current Season Pctl.']],
    ];
    return tableData;
}

//! This class is an abomination
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
    }

    update(tableData) {
        this.tableBody.innerHTML = '';
        for (let row of tableData) {
            let tr = this.tableBody.appendChild(document.createElement('tr'));

            if (typeof row[1] === 'number' && !isNaN(row[1])) {
                row[1] = row[1].toFixed(0);
            } else if (row[1] === null) {
                row[1] = '';
            }
            if (typeof row[2] === 'number' && !isNaN(row[2])) {
                row[2] = row[2].toFixed(0);
            } else if (row[1] === null) {
                row[2] = '';
            }

            if (row.length > 2 && row[1] != row[2] && row[2] !== null) {
                tr.innerHTML = `<td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td>`;
            }
            else {
                tr.innerHTML = `<td>${row[0]}</td><td class="w3-center" colspan=2>${row[1]}</td>`;
            }
        }
    }
}
