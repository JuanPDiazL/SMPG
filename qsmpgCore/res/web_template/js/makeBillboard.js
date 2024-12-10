"use strict";

function arrayMoreLess20(numbers) {
    return numbers.map(n => [n * (1 + .2), n, n * (1 - .2)]);
}
function getUpTo(places, index) {
    return Object.values(places).map(place => place[index]);
}
function genxs(dataIds, length, customxs = {}, defaultxs = 'data_xs') {
    const xs = ascendingArray(length);
    return Object.fromEntries(dataIds.map(id => [id, (id in customxs) ? customxs[id] : defaultxs]));
}
function extendScalar(value, length) {
    return new Array(length).fill(value);
}
function ascendingArray(n, offset=0) {
    const arr = [];
    for (let i = offset; i < n; i++) {
        arr.push(i);
    }
    return arr;
}
function getLegend(title, color, data, chartTypes = {}, points = {}) {
    let chartType = '';
    switch (chartTypes[title]) {
        case 'scatter':
            chartType = 'fiber_manual_record'
            break;
        case 'area-line-range':
            chartType = 'area_chart'
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
            // min: .5,
            // max: 35,
            label: {
                text: 'Time',
                position: 'outer-right',
            },
            tick: {
                rotate: -35,
                // autorotate: true,
                culling: { max: '13' },
                // multiline: false,
            },
            padding: {
                // left: 1,
                // right: 0,
            },
        },
        y: {
            // min: 0,
            label: {
                text: 'Rainfall (mm)',
                position: 'outer-top',
            },
            padding: {
                bottom: 10,
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
        grouped: true,
        position: function (data, width, height, element, pos) {
            // get root svg from element
            let svg = element;
            while (svg && svg.tagName !== 'svg') {
                svg = svg.parentElement;
            }
            // use jquery to get properties of root svg
            svg = $(svg);
            const viewBox = svg.attr('viewBox').split(' ').map(Number);
            const svgWidth = svg.width();
            const svgHeight  = svg.height();
            // calculate final coordinates
            const scaleX = svgWidth / viewBox[2];
            const scaleY  = svgHeight / viewBox[3];
            let transformedX = pos.xAxis * scaleX;
            const transformedY = pos.y * scaleY;
            if(transformedX + width > svgWidth) {
                // avoid out of bounds
                transformedX -= width;
            }
            return {
                top: transformedY,
                left: transformedX
            };
        },
    },
    point: {
        show: false,
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
    size: {
        width: 800,
        height: 450,
    },
    resize: {
        auto: "viewBox"
    },
};
const chartColors = {
    'LTA': '#FF0000',
    'Median': '#000000',
    'LTA±20%': '#00AFE5',
    'Climatology Average': '#FF0000',
    'Ensemble Med.': '#000000',
    'Current Season': '#0000FF',
    'Seasonal Accumulation': '#78ADD2',
    'Current Season Accumulation': '#0000FF',
    'Current Season Total': '#0000FF',
    'Forecast': '#FF00FF',
    'Forecast Accumulation': '#FF00FF',

    '67 Pctl.': '#00FF00',
    'D0: 31 Pctl.': '#FFFF00',
    'D1: 21 Pctl.': '#FCD37F',
    'D2: 11 Pctl.': '#FFAA00',
    'D3: 6 Pctl.': '#E60000',
    'D4: 3 Pctl.': '#730000',

    'LTA±St. Dev.': '#008000',
    '(33, 67) Pctl.': '#000000',
    'E. LTA±St. Dev.': '#FFA500',
    'E. (33, 67) Pctl.': '#0000FF',
}

class AccumulationsBillboardChart {
    constructor(containerElement) {
        this.columnNames = datasetProperties['sub_season_monitoring_ids'];
        this.containerElement = containerElement;
        this.lastCoordinates = new Array(2).fill(datasetProperties['sub_season_monitoring_ids'].length - 1);
        this.currentLength = currentMonitoringLength;
        this.chartTypes = {
            'LTA±20%': 'area-line-range',
            'LTA±St. Dev.': 'scatter',
            '(33, 67) Pctl.': 'scatter',
        };
        this.xs = {
            'data_xs': ascendingArray(this.columnNames.length),
            'scatter_xs': this.lastCoordinates,
        };
        this.customxs = {
            'Forecast Accumulation': 'forecast_xs',
            'LTA±St. Dev.': 'scatter_xs',
            '(33, 67) Pctl.': 'scatter_xs',
        };
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
            point: { show: true, },
        };

        this.plot = bb.generate({
            bindto: this.containerElement,
            data: { json: {}, },
            ..._.merge(defaultOptions, chartOptions)
        });
    }
    update(index) {
        const jsonData = {
            ...this.xs,
            ...selected_seasons_cumsum[index],
            'Median': seasonal_long_term_stats[index]['Median'],
            'LTA±20%': arrayMoreLess20(seasonal_long_term_stats[index]['LTA']),
            'LTA': seasonal_long_term_stats[index]['LTA'],
            'Current Season Accumulation':place_long_term_stats[index]['Current Season Accumulation']
            .slice(monitoringOffset),
            'LTA±St. Dev.': [
                seasonal_general_stats[index]['LTA'] + seasonal_general_stats[index]['St. Dev.'],
                seasonal_general_stats[index]['LTA'] - seasonal_general_stats[index]['St. Dev.'],
            ],
            '(33, 67) Pctl.': [
                place_general_stats[index]['Climatology 33 Pctl.'],
                place_general_stats[index]['Climatology 67 Pctl.'],
            ],
        };
        if (place_general_stats[index]['Forecast'] !== null) {
            jsonData['Forecast Accumulation'] = [
                place_general_stats[index]['Current Season Total'], 
                place_general_stats[index]['Current Season+Forecast'],
            ];
            jsonData['forecast_xs'] = [this.currentLength-1, this.currentLength];
        }
        this.plot.load({
            json: jsonData,
            xs: genxs(Object.keys(jsonData), this.columnNames.length, this.customxs),
            type: 'line',
            types: this.chartTypes,
            colors: chartColors,
            unload: true,
        });
    }
}

class CurrentBillboardChart {
    constructor(containerElement) {
        this.columnNames = datasetProperties['sub_season_ids'];
        this.containerElement = containerElement;
        this.currentLength = currentLength;
        this.chartTypes = {
            'Current Season': 'bar',
            'Forecast': 'bar',
            'Climatology Average': 'line',
        };
        const chartOptions = {
            axis: { x: { tick: { format: (index) => { return this.columnNames[index]; }, }, }, },
            tooltip: { format: { value: function (value, ratio, id) { return Math.round(value); }, }, },
            legend: {
                contents: {
                    bindto: '#legend2',
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
        };
        this.xs = {
            'data_xs': ascendingArray(this.columnNames.length),
        };
        this.customxs = {
            'Current Season': 'data_xs',
            'Forecast': 'bar_xs',
        };
        this.plot = bb.generate({
            bindto: this.containerElement,
            data: { json: {}, },
            ..._.merge(defaultOptions, chartOptions)
        });
    }

    update(index) {
        const jsonData = {
            ...this.xs,
            'Current Season': place_long_term_stats[index]['Current Season'],
            'Climatology Average': place_long_term_stats[index]['Climatology Average'],
        };
        if (place_general_stats[index]['Forecast'] !== null) {
            jsonData['Forecast'] = [place_general_stats[index]['Forecast']];
            jsonData['bar_xs'] = [this.currentLength];
        }
        this.plot.load({
            json: jsonData,
            xs: genxs(Object.keys(jsonData), this.columnNames.length, this.customxs),
            types: this.chartTypes,
            colors: chartColors,
            unload: true,
        });
    }
}

class EnsembleBillboardChart {
    constructor(containerElement) {
        this.columnNames = datasetProperties['sub_season_monitoring_ids'];
        this.containerElement = containerElement;
        this.lastCoordinates = new Array(2).fill(datasetProperties['sub_season_monitoring_ids'].length - 1);
        this.currentLength = currentMonitoringLength;
        this.chartTypes = {
            'LTA±20%': 'area-line-range',
            'LTA±St. Dev.': 'scatter',
            'E. LTA±St. Dev.': 'scatter',
            '(33, 67) Pctl.': 'scatter',
            'E. (33, 67) Pctl.': 'scatter',
        },
        this.xs = {
            'data_xs': ascendingArray(this.columnNames.length),
            'scatter_xs': this.lastCoordinates,
        };
        this.customxs = {
            'LTA±St. Dev.': 'scatter_xs',
            'E. LTA±St. Dev.': 'scatter_xs',
            '(33, 67) Pctl.': 'scatter_xs',
            'E. (33, 67) Pctl.': 'scatter_xs',
        };
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
            point: { show: true, },
        };

        this.plot = bb.generate({
            bindto: this.containerElement,
            data: { json: {}, },
            ..._.merge(defaultOptions, chartOptions)
        });
    }
    update(index) {
        const jsonData = {
            ...this.xs,
            ...selected_seasons_ensemble[index],
            'LTA±20%': arrayMoreLess20(seasonal_long_term_stats[index]['LTA']),
            'LTA': seasonal_long_term_stats[index]['LTA'],
            'Ensemble Med.': selected_seasons_long_term_stats[index]['Ensemble Med.'],
            'Current Season Accumulation': place_long_term_stats[index]['Current Season Accumulation']
            .slice(monitoringOffset),
            'LTA±St. Dev.': [
                seasonal_general_stats[index]['LTA'] + seasonal_general_stats[index]['St. Dev.'],
                seasonal_general_stats[index]['LTA'] - seasonal_general_stats[index]['St. Dev.'],
            ],
            'E. LTA±St. Dev.': [
                selected_seasons_general_stats[index]['E. LTA'] + selected_seasons_general_stats[index]['St. Dev.'],
                selected_seasons_general_stats[index]['E. LTA'] - selected_seasons_general_stats[index]['St. Dev.'],
            ],
            '(33, 67) Pctl.': [
                place_general_stats[index]['Climatology 33 Pctl.'],
                place_general_stats[index]['Climatology 67 Pctl.'],
            ],
            'E. (33, 67) Pctl.': [
                selected_seasons_general_stats[index]['Ensemble 33 Pctl.'],
                selected_seasons_general_stats[index]['Ensemble 67 Pctl.'],
            ],
        }
        this.plot.load({
            json: jsonData,
            xs: genxs(Object.keys(jsonData), this.columnNames.length, this.customxs),
            types: this.chartTypes,
            colors: chartColors,
            unload: true,
        });
    }
}

class AccumulationsBillboardCurrentChart {
    constructor(containerElement) {
        this.columnNames = datasetProperties['year_ids'];
        this.columnNames.push(datasetProperties['current_season_id']);
        this.containerElement = containerElement;
        this.lastCoordinates = this.columnNames.length - 1;
        this.chartTypes = {
            'Seasonal Accumulation': 'bar',
            'Current Season Total': 'bar',
            'Climatology Average': 'line',
            'D4: 3 Pctl.': 'line',
            'D3: 6 Pctl.': 'line',
            'D2: 11 Pctl.': 'line',
            'D1: 21 Pctl.': 'line',
            'D0: 31 Pctl.': 'line',
            '67 Pctl.': 'line',
        };
        this.xs = {
            'data_xs': ascendingArray(this.columnNames.length),
            'bar_xs': [this.lastCoordinates],
        };
        this.customxs = {
            'Current Season Total': 'bar_xs',
        };
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
            point: { show: true, },
            groups: [
                ['D4: 3 Pctl.', 'D3: 6 Pctl.', 'D2: 11 Pctl.', 'D1: 21 Pctl.', 'D0: 31 Pctl.', '67 Pctl.'],
            ],
            bar: {
                zerobased: false,
            },
            area: {
                zerobased: false,
            }
        };
        this.plot = bb.generate({
            bindto: this.containerElement,
            data: { json: {}, },
            ..._.merge(defaultOptions, chartOptions)
        });
    }

    update(index) {
        const jsonData = {
            ...this.xs,
            'Seasonal Accumulation': seasonal_current_totals[index],
            'Current Season Total': [place_general_stats[index]['Current Season Total']],
            'Climatology Average': extendScalar(place_general_stats[index]['Climatology Average at Current Dekad'], this.columnNames.length),
            '67 Pctl.': extendScalar(place_general_stats[index]['Seasonal 67 Pctl.'], this.columnNames.length),
            '33 Pctl.': extendScalar(place_general_stats[index]['Seasonal 33 Pctl.'], this.columnNames.length),
            'D1: 21 Pctl.': extendScalar(place_general_stats[index]['Seasonal 21 Pctl.'], this.columnNames.length),
            'D2: 11 Pctl.': extendScalar(place_general_stats[index]['Seasonal 11 Pctl.'], this.columnNames.length),
            'D3: 6 Pctl.': extendScalar(place_general_stats[index]['Seasonal 6 Pctl.'], this.columnNames.length),
            'D4: 3 Pctl.': extendScalar(place_general_stats[index]['Seasonal 3 Pctl.'], this.columnNames.length),
        };
        this.plot.load({
            json: jsonData,
            xs: genxs(Object.keys(jsonData), this.columnNames.length, this.customxs),
            types: this.chartTypes,
            colors: chartColors,
            unload: true,
        });
    }
}
