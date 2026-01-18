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
    for (let i = 0; i < n; i++) {
        arr.push(i + offset);
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
            // use d3 to get properties of root svg
            svg = d3.select(svg);
            const viewBox = svg.attr('viewBox').split(' ').map(Number);
            const svgWidth = svg.node().getBoundingClientRect().width;
            const svgHeight  = svg.node().getBoundingClientRect().height;
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

function makeAccumulationsPlot(containerElement) {
    let xNames = [...datasetProperties['sub_season_monitoring_ids']];
    let xsDefinition = {
        'default_xs': ascendingArray(xNames.length),
        'scatter_xs': [xNames.length - 1, xNames.length - 1],
        'forecast_xs': ascendingArray(Math.max(parameters.forecast_length + 1, 1), currentMonitoringLength - 1),
    };
    const xsDataRelation = {
            'Forecast Accumulation': 'forecast_xs',
            'LTA±St. Dev.': 'scatter_xs',
            '(33, 67) Pctl.': 'scatter_xs',
    };
    const plotTypes = {
            'LTA±20%': 'area-line-range',
            'LTA±St. Dev.': 'scatter',
            '(33, 67) Pctl.': 'scatter',
    };
    const getAccumulationsPlotData = (index) => {
        let data = {
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
            'Forecast Accumulation': [
                place_general_stats[index]['Current Season Total'], 
                ...place_long_term_stats[index]['Forecast Accumulation']
                .slice(monitoringOffset+currentMonitoringLength),
            ]
        };
        return data;
    };
    const plot = new BBPlot(containerElement, getAccumulationsPlotData, xNames, 
        xsDefinition, xsDataRelation, plotTypes);
    return plot;
}

function makeAccumulationsTable(containerElement) {
    const getAccumulationsTableData = (index) => {
        let data = {};
        const assesmentTitle = `Assessment at Current ${period_unit}`;
        data[assesmentTitle] = [
            [null, 'Sel. Yrs.', 'Clim.'],
            [`LTA C. ${SHORT_NAMES[period_unit]}`, selected_seasons_general_stats[index]['LTA up to Current Season'], seasonal_general_stats[index]['LTA up to Current Season']],
            [`C. ${SHORT_NAMES[period_unit]}/LTA Pct.`, selected_seasons_general_stats[index]['C. Dk./LTA Pct.'], seasonal_general_stats[index]['C. Dk./LTA Pct.']],
        ]
        data["[hide header]"] = [
            [`Total C. ${SHORT_NAMES[period_unit]}`, place_general_stats[index]['Current Season Total']],
        ];
        if(hasForecast) {
            data["[hide header]"].push(
            [`Total C. ${SHORT_NAMES[period_unit]}+Forecast`, place_general_stats[index]['Current Season+Forecast']]);
        }

        return data;
    };

    const table = new Table(containerElement, getAccumulationsTableData)
    return table;
}

function makeCurrentYearPlot(containerElement) {
    let xNames = [...datasetProperties['sub_season_ids']];
    
    let xsDefinition = {
        'default_xs': ascendingArray(xNames.length),
        'forecast_xs': ascendingArray(Math.max(parameters.forecast_length, 1), currentLength),
    };
    let xsDataRelation = {
        'Forecast': 'forecast_xs',
    };
    const plotTypes = {
        'Current Season': 'bar',
        'Forecast': 'bar',
        'Climatology Average': 'line',
    };
    const makeCurrentYearPlotData = (index) => {
        const xLength = seasonal_current_totals[index].length + 1;
        let data = {
            'Current Season': place_long_term_stats[index]['Current Season'],
            'Climatology Average': place_long_term_stats[index]['Climatology Average'],
            'Forecast': place_long_term_stats[index]['Forecast']
            .slice(currentLength),
        }
        return data;
    };
    const makeCurrentYearPlotGridLines = (index) => {
        let sosAvgClass = place_general_stats[index]['Start of Season of Avg.'];
        let sosCurrentClass = place_general_stats[index]['Start of Season'];
        let gridLines = [];
        if (place_general_stats[index]['Start of Season of Avg. Raw'] !== null) {
            gridLines.push({
            value: place_general_stats[index]['Start of Season of Avg. Raw'],
            text: 'SoS of Historical Avg.',
            position: "middle",
            class: "sos-marker avg-sos-marker"
            });
        } 
        if (place_general_stats[index]['Start of Season Raw'] !== null
            && sosCurrentClass !== null
        ) {
            gridLines.push({
            value: place_general_stats[index]['Start of Season Raw'],
            text: sosCurrentClass.startsWith('Possible Start') ? 'Possible SoS' : 'SoS of Current Season',
            position: "start",
            class: "sos-marker current-sos-marker"
            });
        }
        return gridLines;
    };
    const options = {
            bar: {
                zerobased: true,
            },
        }
    const plot = new BBPlot(containerElement, makeCurrentYearPlotData, xNames, 
        xsDefinition, xsDataRelation, plotTypes, makeCurrentYearPlotGridLines, options);
    return plot;
}

function makeCurrentYearTable(containerElement) {
    const getAccumulationsCurrentTableData = (index) => {
        let data = {
            "Seasonal Analysis": [
                [null, 'Sel. Yrs.', 'Clim.'],
                ['LTA', selected_seasons_general_stats[index]['LTA'], seasonal_general_stats[index]['LTA']],
                ['St. Dev.', selected_seasons_general_stats[index]['St. Dev.'], seasonal_general_stats[index]['St. Dev.']],
            ],
        }
        if (hasSos) {
            data["Rainy Season Status"] = [
                ['SoS', place_general_stats[index]['Start of Season']],
                ['SoS Anomaly', place_general_stats[index]['Start of Season Anomaly']],
            ]
        }
        return data;
    };

    const table = new Table(containerElement, getAccumulationsCurrentTableData)
    return table;
}

function makeEnsemblePlot(containerElement) {
    let xNames = datasetProperties['sub_season_monitoring_ids'];
    
    const xsDefinition = {
        'default_xs': ascendingArray(xNames.length),
        'scatter_xs': [xNames.length - 1, xNames.length - 1],
    };
    const xsDataRelation = {
            'LTA±St. Dev.': 'scatter_xs',
            'E. LTA±St. Dev.': 'scatter_xs',
            '(33, 67) Pctl.': 'scatter_xs',
            'E. (33, 67) Pctl.': 'scatter_xs',
    };
    const plotTypes = {
            'LTA±20%': 'area-line-range',
            'LTA±St. Dev.': 'scatter',
            'E. LTA±St. Dev.': 'scatter',
            '(33, 67) Pctl.': 'scatter',
            'E. (33, 67) Pctl.': 'scatter',
    };
    const getEnsemblePlotData = (index) => {
        const xLength = seasonal_current_totals[index].length + 1;
        return {
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
    };
    const plot = new BBPlot(containerElement, getEnsemblePlotData, xNames, 
        xsDefinition, xsDataRelation, plotTypes);
    return plot;
}

function makeEnsembleTable(containerElement) {
    const getAccumulationsCurrentTableData = (index) => {
        return {
            "Projection at EoS": [
                [null, 'Sel. Yrs.', 'Clim.'],
                ['Ensemble Med.', selected_seasons_general_stats[index]['Ensemble Med.'], seasonal_general_stats[index]['Ensemble Med.']],
                ['LTA', selected_seasons_general_stats[index]['LTA'], seasonal_general_stats[index]['LTA']],
                ['Ensemble Med./LTA Pct.', selected_seasons_general_stats[index]['Ensemble Med./LTA Pct.'], seasonal_general_stats[index]['Ensemble Med./LTA Pct.']],
                ['Ensemble Med. Pctl.', selected_seasons_general_stats[index]['Ensemble Med. Pctl.'], selected_seasons_general_stats[index]['Ensemble Med. Pctl.']],
            ],
            "Probability at EoS": [
                [null, 'Sel. Yrs.', 'Clim.'],
                ['Above Normal', selected_seasons_general_stats[index]['E. Prob. Above Normal Pct.'], seasonal_general_stats[index]['E. Prob. Above Normal Pct.']],
                ['Normal', selected_seasons_general_stats[index]['E. Prob. of Normal Pct.'], seasonal_general_stats[index]['E. Prob. of Normal Pct.']],
                ['Below Normal', selected_seasons_general_stats[index]['E. Prob. Below Normal Pct.'], seasonal_general_stats[index]['E. Prob. Below Normal Pct.']],
            ]
        }
    };

    const table = new Table(containerElement, getAccumulationsCurrentTableData)
    return table;
}

function makeAccumulationPercentilesPlot(containerElement) {
    let xNames = [...datasetProperties['year_ids']];
    xNames.push(datasetProperties['current_season_id']);
    
    const xsDefinition = {
        'default_xs': ascendingArray(xNames.length),
        'end_xs': [xNames.length - 1],
    };
    const xsDataRelation = {
        'Current Season Total': 'end_xs',
    };
    const plotTypes = {
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
    const getAccumulationsCurrentPlotData = (index) => {
        const xLength = seasonal_current_totals[index].length + 1;
        return {
            'Seasonal Accumulation': seasonal_current_totals[index],
            'Current Season Total': [place_general_stats[index]['Current Season Total']],
            'Climatology Average': extendScalar(place_general_stats[index]['Climatology Average at Current Dekad'], xLength),
            '67 Pctl.': extendScalar(place_general_stats[index]['Seasonal 67 Pctl.'], xLength),
            '33 Pctl.': extendScalar(place_general_stats[index]['Seasonal 33 Pctl.'], xLength),
            'D1: 21 Pctl.': extendScalar(place_general_stats[index]['Seasonal 21 Pctl.'], xLength),
            'D2: 11 Pctl.': extendScalar(place_general_stats[index]['Seasonal 11 Pctl.'], xLength),
            'D3: 6 Pctl.': extendScalar(place_general_stats[index]['Seasonal 6 Pctl.'], xLength),
            'D4: 3 Pctl.': extendScalar(place_general_stats[index]['Seasonal 3 Pctl.'], xLength),
        }
    };
    const plot = new BBPlot(containerElement, getAccumulationsCurrentPlotData, xNames, 
        xsDefinition, xsDataRelation, plotTypes);
    return plot;
}

function makeAccumulationPercentilesTable(containerElement) {
    const getAccumulationsCurrentTableData = (index) => {
        return {
            "Historical Rainfall Statistics": [
                ['67 Percentile', place_general_stats[index]['Seasonal 67 Pctl.'], null],
                ['33 Percentile', place_general_stats[index]['Seasonal 33 Pctl.'], null],
                ['11 Percentile', place_general_stats[index]['Seasonal 11 Pctl.'], null],
            ],
            "Current Season Statistics": [
                ['Current Season Pctl.', place_general_stats[index]['Current Season Pctl.']],
            ]
        }
    };

    const table = new Table(containerElement, getAccumulationsCurrentTableData)
    return table;
}

class BBPlot {
    constructor(containerElement, dataGetter, xNames, xsDefinition, 
        xsDataRelation, chartTypes, 
        gridLinesGetter = () => [], 
        customSettings = {}) {
        this.containerElement = containerElement;
        this.dataGetter = dataGetter;
        this.xNames = xNames;
        this.xsDefinition = xsDefinition;
        this.xsDataRelation = xsDataRelation;
        this.chartTypes = chartTypes;
        this.gridLinesGetter = gridLinesGetter;
        this.customSettings = customSettings;

        const chartContainer = this.containerElement
            .append("div")
            .attr("class", "chart-container w3-container w3-padding-small");
        const legendContainer = this.containerElement
            .append("div")
            .attr("class", "legend-container w3-container w3-padding-small");
        
        
        const chartOptions = {
            axis: { x: { tick: { format: (index) => { return this.xNames[index]; }, }, }, },
            tooltip: { format: { value: function (value, ratio, id) { return Math.round(value); }, }, },
            legend: {
                contents: {
                    bindto: legendContainer.node(),
                    template: (title, color, data) => getLegend(title, color, data, this.chartTypes),
                },
            },
            point: { show: true, },
            bar: {
                zerobased: false,
            },
            area: {
                zerobased: false,
            }
        };
        this.plot = bb.generate({
            bindto: chartContainer.node(),
            data: { json: {}, },
            ..._.merge(defaultOptions, chartOptions, this.customSettings)
        });
    }

    update(index) {
        const data = this.dataGetter(index);
        const dataIds = Object.keys(data);
        const xs = Object.fromEntries(dataIds.map(id => {
                return [id, (id in this.xsDataRelation) 
                    ? this.xsDataRelation[id] : "default_xs"];
            }));
        const jsonData = {
            ...this.xsDefinition,
            ...data,
        };
        this.plot.load({
            json: jsonData,
            xs: xs,
            types: this.chartTypes,
            colors: chartColors,
            unload: true,
        });
        this.plot.xgrids(this.gridLinesGetter(index));
    }
}

class Table {
    constructor(containerElement, dataGetter) {
        this.containerElement = containerElement;
        this.dataGetter = dataGetter;

        this.tableContainer = this.containerElement
            .append("div")
            .attr("class", "chart-table-container w3-hide");
        this.tableCollection = null;
    }

    update(index) {
        const data = this.dataGetter(index);
        this.tableContainer.selectAll("table").remove();
        this.tableCollection = this.tableContainer
        .selectAll("table")
            .data(Object.keys(data))
            .join("table")
                .attr("class", "chart-table w3-table w3-bordered w3-border")
                .call(table => {
                    table.append("thead")
                    .append("th")
                    .classed("w3-hide", d => d === "[hide header]")
                    .attr("colspan", d => data[d][0].length)
                        .text(d => d);
            
                    table.append("tbody").selectAll("tr")
                        .data(d => data[d])
                        .join("tr").selectAll("td")
                            .data(d => d)
                            .join("td")
                                .call(td => {
                                    td.text((d) => {
                                            if (typeof d === 'number' && !isNaN(d)) {
                                                return d.toFixed(0);
                                            } else if (d === null) {
                                                return '';
                                            } else {
                                                return d;
                                            }
                                        });
                                })
            });
    }
}

class chartCard {
    constructor(containerSelector, defaultCardType = null) {
        this.dataIndex = -1;
        this.cardTypes = {
            "Disabled": {
                "full title": "Disabled",
                "plot": () => {},
                "table": () => {},
            },
            "Seasonal Accumulations": {
                "full title": "Seasonal Accumulations",
                "plot": makeAccumulationsPlot,
                "table": makeAccumulationsTable,
            }, 
            "Current Year Status": {
                "full title": `Current Year Status: ${datasetProperties.current_season_id}. Climatology: [${datasetProperties.climatology_year_ids[0]}, ${getLast(datasetProperties.climatology_year_ids)}]`,
                "plot": makeCurrentYearPlot,
                "table": makeCurrentYearTable,
            }, 
            "Ensemble": {
                "full title": "Ensemble",
                "plot": makeEnsemblePlot,
                "table": makeEnsembleTable,
            },
            "Seasonal Accumulation Percentiles": {
                "full title": "Seasonal Accumulation Percentiles",
                "plot": makeAccumulationPercentilesPlot,
                "table": makeAccumulationPercentilesTable,
            },
        };
        this.cardType = defaultCardType;

        this.cardContainer = d3.select(containerSelector);
        this.cardRoot = this.cardContainer
            .append("div")
            .attr("class", "plot-card w3-container w3-half w3-cell w3-margin-bottom w3-padding-small");
        this.cardElement = this.cardRoot
            .append("div")
            .attr("class", "w3-card");

        this.cardHeader = this.cardElement
            .append("header")
            .attr("class", "card-header w3-blue-grey");
        this.toggleTableButton = this.cardHeader
            .append("span")
            .append("button")
                .attr("class", "card-button mi w3-button w3-ripple w3-right capture-ignore")
                .attr("title", "Toggle display table")
                .text("table_chart")
                .on("click", (event) => {
                    if(this.table !== null) {
                        this.table.tableContainer.classed("w3-hide", !this.table.tableContainer.classed("w3-hide"));
                    }
                });
        this.graphTypeSelectContainer = this.cardHeader
            .append("div")
            .attr("class", "card-title-select w3-dropdown-click")
            .on("click", (event) => {
                const graphTypeSelectContent = this.graphTypeSelectContent;
                graphTypeSelectContent
                    .classed("w3-show", !graphTypeSelectContent.classed("w3-show"));
            });
        this.graphTypeSelectOpenButton = this.graphTypeSelectContainer
            .append("button")
            .attr("class", "card-title-select-button w3-button")
            .text(this.cardTypes[this.cardType]["full title"]);
        this.graphTypeSelectContent = this.cardHeader
            .append("div")
            .attr("class", "card-title-select- w3-dropdown-content w3-bar-block w3-border");
        this.graphTypeSelectContent.selectAll("button").data(Object.keys(this.cardTypes))
            .join("button")
                .attr("class", "card-title-select-button w3-bar-item w3-button")
                .attr("value", d => d)
                .text(d => d)
            .on("click", (event) => {
                const graphTypeSelectContent = this.graphTypeSelectContent;
                graphTypeSelectContent.classed("w3-show", false);
                this.changePlot(event);
            });

        this.cardBody = this.cardElement
            .append("div")
            .attr("class", "plot-container w3-container w3-padding-small");
            
        this.chart = this.cardTypes[this.cardType]["plot"](this.cardBody);
        this.table = this.cardTypes[this.cardType]["table"](this.cardBody);
    }

    changePlot(event) {
        const plotType = event.target.value;
        this.cardType = plotType;
        this.graphTypeSelectOpenButton.text(this.cardTypes[plotType]["full title"]);
        this.cardBody.selectChildren().remove();
        if (plotType == "Disabled") {
            return;
        }

        this.chart = this.cardTypes[plotType]["plot"](this.cardBody);
        this.table = this.cardTypes[plotType]["table"](this.cardBody);
        this.update(this.dataIndex);
    }

    update(index) {
        this.dataIndex = index;
        this.chart.update(index);
        this.table.update(index);
    }
}