function getDataAssessmentCD(index) {
    let tableData = [
        [`Total C. ${SHORT_NAMES[period_unit]}`, place_general_stats[index]['Current Season Total'], place_general_stats[index]['Current Season Total']],
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
    return tableData;
}
function getDataProjectionEoS(index) {
    let tableData = [
        ['Ensemble Med.', selected_seasons_general_stats[index]['Ensemble Med.'], seasonal_general_stats[index]['Ensemble Med.']],
        ['LTA', selected_seasons_general_stats[index]['LTA'], seasonal_general_stats[index]['LTA']],
        ['Ensemble Med./LTA Pct.', selected_seasons_general_stats[index]['Ensemble Med./LTA Pct.'], seasonal_general_stats[index]['Ensemble Med./LTA Pct.']],
        ['Ensemble Med. Pctl.', selected_seasons_general_stats[index]['Ensemble Med. Pctl.'], seasonal_general_stats[index]['Ensemble Med. Pctl.']],
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
        ['67 Percentile', place_general_stats[index]['Seasonal 67 Pctl.'], place_general_stats[index]['Seasonal 67 Pctl.']],
        ['33 Percentile', place_general_stats[index]['Seasonal 33 Pctl.'], place_general_stats[index]['Seasonal 33 Pctl.']],
        ['11 Percentile', place_general_stats[index]['Seasonal 11 Pctl.'], place_general_stats[index]['Seasonal 11 Pctl.']],
    ];
    return tableData;
}
function getCurrentSeasonTable(index) {
    let tableData = [
        ['Current Season Pctl.', place_general_stats[index]['Current Season Pctl.'], place_general_stats[index]['Current Season Pctl.']],
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
    }

    update(tableData) {
        this.tableBody.innerHTML = '';
        for (let row of tableData) {
            let tr = this.tableBody.appendChild(document.createElement('tr'));
            let col1 = row[1] !== null ? row[1].toFixed(0) : '';
            let col2 = row[2] !== null ? row[2].toFixed(0) : '';
            if (col1 != col2) {
                tr.innerHTML = `<td>${row[0]}</td><td>${col1}</td><td>${col2}</td>`;
            }
            else {
                tr.innerHTML = `<td>${row[0]}</td><td class="w3-center" colspan=2>${col1}</td>`;
            }
        }
    }
}
