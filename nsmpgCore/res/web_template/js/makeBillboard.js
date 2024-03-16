"use strict"

function arrayMoreLess20(numbers) {
    return numbers.map(n => [n * (1 + .2), n, n * (1 - .2)]);
}
function getUpTo(places, index) {
    return Object.values(places).map(place => place[index]);
}
function getxs(years) {
    return Object.fromEntries(years.map(year => [year, 'x']));
}
function extendScalar(value, length) {
    return new Array(length).fill(value);
}
function ascendingArray(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
        arr.push(i);
    }
    return arr;
}
function getSize(containerElement) {
    return {
        width: parseInt(d3.select(containerElement).style('width'), 10),
        // height: parseInt(d3.select(containerElement).style('height'), 10),
        height: parseInt(d3.select(containerElement).style('width'), 10) * (9/16),
    }
}
function onResize(containerElement, plot) {
    const size = getSize(containerElement);
    plot.resize(size);
}
function getLegend(title, color, data, chartTypes = {}, points = {}) {
    let chartType = '';
    switch (chartTypes[title]) {
        case 'scatter':
            chartType = 'category'
            break;
        case 'area-line-range':
            chartType = 'signal_cellular_0_bar'
            break;
        case 'bar':
            chartType = 'bar_chart'
            break;
        case 'area':
            chartType = 'area_chart'
            break;
        default:
            chartType = 'show_chart';
            break;
    }
    return `<span style='padding:2px; font-size:10.5px;'><span class="mi mi-button" style="color:${color};">${chartType}</span> ${title}</span>`;
}

const defaultOptions = {
    axis: {
        x: {
            min: .5,
            // max: 35,
            label: {
                text: 'Time',
                position: 'outer-right',
            },
            tick: {
                // rotate: -35,
                autorotate: true,
                culling: { max: '13' },
                multiline: false,
            },
        },
        y: {
            min: 0,
            label: {
                text: 'Rainfall (mm)',
                position: 'outer-top',
            },
            padding: {
                bottom: 0,
            },
        },
        // y2: {
        //     show: true,
        // },
    },
    grid: {
        x: {
            show: true,
            // lines: [
            //     {value: 4.5, text: 'Lable 4.5', position: 'start'},
            // ]
        },
        y: {
            show: true,
        },
    },
    legend: {
        // usePoint: true,
    },
    tooltip: {
        order: 'desc',
    },
    point: {
        show: false,
        pattern: [
            "<g><text x='0' y='6' class='mi-fill' style='font-size:7px'>circle</text></g>",
            "<g><text x='0' y='6' class='mi-fill' style='font-size:7px'>change_history</text></g>",
            "<g><text x='0' y='6' class='mi-fill' style='font-size:7px'>square</text></g>",
            // 'circle',
            // "<polygon points='4 0 0 8 8 8'></polygon>",
            // 'rectangle',
        ]
    },
    transition: {
        duration: false,
    },
    line: {
        point: false,
    },
    area: {
        front: false,
    },
    padding: {
        mode: 'fit',
    },
    bar: {
        front: true,
    },
};

let chartColors = {
    'LTA': '#FF0000',
    'LTA±20%': '#00AFE5',
    'Avg.': '#FF0000',
    'E. LTM': '#000000',
    'Current Season': '#0000FF',
    'Seasonal Accumulation': '#78ADD2',
    'Current Season Accumulation': '#0000FF',

    'D0: 31 Pctl.': '#FFFF00',
    'D1: 21 Pctl.': '#FCD37F',
    'D2: 11 Pctl.': '#FFAA00',
    'D3: 6 Pctl.': '#E60000',
    'D4: 3 Pctl.': '#730000',

    'LTA±St. Dev.': '#008000',
    '(33, 67) Pctl.': '#000000',
    'E. LTM±St. Dev.': '#FFA500',
    'E. (33, 67) Pctl.': '#0000FF',
}
class AccumulationsBillboardChart {
    constructor(seasonalData, placeData, datasetProperties, containerElement) {
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.columnNames = datasetProperties['sub_season_ids'];
        this.containerElement = containerElement;
        this.lastCoordinates = [datasetProperties['sub_season_ids'].length - 1, datasetProperties['sub_season_ids'].length - 1];
        this.currentLength = this.placeData[firstPlaceKey]['Current Season'].length - 1;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'));
        this.chartTypes = {
            'LTA±20%': 'area-line-range',
            'LTA±St. Dev.': 'scatter',
            '(33, 67) Pctl.': 'scatter',
        }
        const chartOptions = {
            // title: {text: 'Seasonal Accumulations'},
            axis: { x: { tick: { format: (index) => { return this.columnNames[index]; }, }, }, },
            tooltip: { format: { value: function (value, ratio, id) { return Math.round(value); }, }, },
            legend: {
                contents: {
                    bindto: '#legend1',
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
            size: getSize(this.containerElement),
            point: { show: true, },
        };

        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {json: {},},
            ..._.merge(defaultOptions, chartOptions)
        });
        this.update(firstPlaceKey);
        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }
    update(index) {
        this.plot.load({
            json: {
                ...this.seasonalData[index]['Sum'],
                'LTM': this.placeData[index]['LTM'],
                'LTA±20%': arrayMoreLess20(this.placeData[index]['LTA']),
                'LTA': this.placeData[index]['LTA'],
                'Current Season Accumulation': this.placeData[index]['Current Season Accumulation'],
                'LTA±St. Dev.': [getLast(this.placeData[index]['LTA']) + getLast(this.placeData[index]['St. Dev.']),
                getLast(this.placeData[index]['LTA']) - getLast(this.placeData[index]['St. Dev.']),
                ],
                '(33, 67) Pctl.': [this.placeData[index]['Pctls.'][0],
                this.placeData[index]['Pctls.'][1]
                ],
            },
            type: 'line',
            types: this.chartTypes,
            colors: chartColors,
        });
        this.plot.xs({
            'LTA±St. Dev.': this.lastCoordinates,
            '(33, 67) Pctl.': this.lastCoordinates,
        });
    }
}

class CurrentBillboardChart {
    constructor(seasonalData, placeData, datasetProperties, containerElement) {
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.columnNames = datasetProperties['sub_season_ids'];
        this.containerElement = containerElement;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'));
        this.chartTypes = {
            'Current Season': 'bar',
            'Avg.': 'line',
        }
        const chartOptions = {
            axis: { x: { tick: { format: (index) => { return this.columnNames[index]; }, }, }, },
            tooltip: { format: { value: function (value, ratio, id) { return Math.round(value); }, }, },
            legend: {
                contents: {
                    bindto: '#legend2',
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
            size: getSize(this.containerElement),
        }
        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {json: {},},
            ..._.merge(defaultOptions, chartOptions)
        });
        this.update(firstPlaceKey);
        window.addEventListener('resize', () => onResize(this.containerElement, this.plot));
    }

    update(index) {
        this.plot.load({
            json: {
                'Current Season': this.placeData[index]['Current Season'],
                'Avg.': this.placeData[index]['Avg.'],
            },
            types: {
                'Current Season': 'bar',
            },
            colors: chartColors,
        });
    }
}

class EnsembleBillboardChart {
    constructor(seasonalData, placeData, datasetProperties, containerElement) {
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.columnNames = datasetProperties['sub_season_ids'];
        this.containerElement = containerElement;
        this.lastCoordinates = [datasetProperties['sub_season_ids'].length - 1, datasetProperties['sub_season_ids'].length - 1];
        this.currentLength = this.placeData[firstPlaceKey]['Current Season'].length - 1;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'), 10);
        this.chartTypes = {
            'LTA±20%': 'area-line-range',
            'LTA±St. Dev.': 'scatter',
            'E. LTM±St. Dev.': 'scatter',
            '(33, 67) Pctl.': 'scatter',
            'E. (33, 67) Pctl.': 'scatter',
        }
        const chartOptions = {
            // title: {text: 'Seasonal Accumulations'},
            axis: { x: { tick: { format: (index) => { return this.columnNames[index]; }, }, }, },
            tooltip: { format: { value: function (value, ratio, id) { return Math.round(value); }, }, },
            legend: {
                contents: {
                    bindto: '#legend3',
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
            size: getSize(this.containerElement),
            point: { show: true, },
        };

        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {json: {},},
            ..._.merge(defaultOptions, chartOptions)
        });
        this.update(firstPlaceKey);
        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }
    update(index) {
        this.plot.load({
            json: {
                ...this.seasonalData[index]['Ensemble Sum'],
                'E. LTM': this.placeData[index]['E. LTM'],
                'LTA±20%': arrayMoreLess20(this.placeData[index]['LTA']),
                'LTA': this.placeData[index]['LTA'],
                'Current Season Accumulation': this.placeData[index]['Current Season Accumulation'],
                'LTA±St. Dev.': [getLast(this.placeData[index]['LTA']) + getLast(this.placeData[index]['St. Dev.']),
                getLast(this.placeData[index]['LTA']) - getLast(this.placeData[index]['St. Dev.']),
                ],
                'E. LTM±St. Dev.': [getLast(this.placeData[index]['E. LTM']) + getLast(this.placeData[index]['St. Dev.']),
                getLast(this.placeData[index]['E. LTM']) - getLast(this.placeData[index]['St. Dev.']),
                ],
                '(33, 67) Pctl.': [this.placeData[index]['Pctls.'][0],
                this.placeData[index]['Pctls.'][1]
                ],
                'E. (33, 67) Pctl.': [this.placeData[index]['E. Pctls.'][0],
                this.placeData[index]['E. Pctls.'][1]
                ],
            },
            types: this.chartTypes,
            colors: chartColors,
        });
        this.plot.xs({
            'LTA±St. Dev.': this.lastCoordinates,
            'E. LTM±St. Dev.': this.lastCoordinates,
            '(33, 67) Pctl.': this.lastCoordinates,
            'E. (33, 67) Pctl.': this.lastCoordinates,
        });
    }
}

class AccumulationsBillboardCurrentChart {
    constructor(seasonalData, placeData, datasetProperties, containerElement) {
        this.columnNames = datasetProperties['climatology_year_ids'];
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.containerElement = containerElement;
        this.currentLength = this.placeData[firstPlaceKey]['Current Season'].length - 1;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'), 10);
        this.chartTypes = {
            'Seasonal Accumulation': 'bar',
            'Avg': 'line',
            'D4: 3 Pctl.': 'area',
            'D3: 6 Pctl.': 'area',
            'D2: 11 Pctl.': 'area',
            'D1: 21 Pctl.': 'area',
            'D0: 31 Pctl.': 'area',
        }
        const chartOptions = {
            // title: {text: 'Seasonal Accumulations'},
            axis: { x: { tick: { format: (index) => { return this.columnNames[index]; }, }, }, },
            tooltip: { format: { value: function (value, ratio, id) { return Math.round(value); }, }, },
            legend: {
                contents: {
                    bindto: '#legend4',
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
            size: getSize(this.containerElement),
            point: { show: true, },
            groups: [
                ['D4: 3 Pctl.', 'D3: 6 Pctl.', 'D2: 11 Pctl.', 'D1: 21 Pctl.', 'D0: 31 Pctl.',]
            ],
        };
        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {json: {},},
            ..._.merge(defaultOptions, chartOptions)
        });
        this.update(firstPlaceKey);

        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }

    update(index) {
        this.plot.load({
            json: {
                'Seasonal Accumulation': getUpTo(this.seasonalData[index]['Sum'], this.currentLength),
                'Avg.': extendScalar(this.placeData[index]['LTA'][this.currentLength], this.columnNames.length),
                'D0: 31 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][4], this.columnNames.length),
                'D1: 21 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][3], this.columnNames.length),
                'D2: 11 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][2], this.columnNames.length),
                'D3: 6 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][1], this.columnNames.length),
                'D4: 3 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][0], this.columnNames.length),
            },
            types: this.chartTypes,
            colors: chartColors,
        });
    }
}
