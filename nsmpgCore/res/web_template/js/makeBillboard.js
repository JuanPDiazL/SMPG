"use strict"

function onResize(containerElement, plot) {
    let containerWidth = parseInt(d3.select(containerElement).style('width'), 10);
    plot.resize({ width: containerWidth, height: containerWidth * (9 / 16) });
}
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
function getLast(arr) {
    return arr[arr.length - 1];
}
function ascendingArray(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
        arr.push(i);
    }
    return arr;
}

class AccumulationsBillboardChart {
    constructor(seasonalData, placeData, yearNames, columnNames, containerElement) {
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.columnNames = columnNames;
        this.containerElement = containerElement;
        this.currentLength = this.placeData[firstPlaceKey]['Current Year'].length - 1;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'), 10);
        let options = {
            axis: {
                x: {
                    // type: 'category',
                    min: .5,
                    label: {
                        text: 'Time',
                        position: 'outer-right',
                    },
                    tick: {
                        rotate: -35,
                        culling: {max: '13'},
                        multiline: false,
                        format: function (i) {
                            return columnNames[i];
                        }
                    },
                },
                y: {
                    min: 0,
                    label: {
                        text: 'Rainfall (mm)',
                        position: 'outer-top',
                    },
                    padding: {
                        bottom: 0
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
                    show: true
                }
            },
            legend: {
                show: true,
                // usePoint: true,
            },
            tooltip: {
                format: {
                    value: function(value, ratio, id) {
                        return Math.round(value);
                    }
                }
            },
            point: {
                // show: false,
                pattern: ['circle', "<polygon points='4 0 0 8 8 8'></polygon>", 'rectangle',]
            },
            transition: {
                duration: false,
            },
            line: {
                point: false,
            }
        };
        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {
                json: {
                    ...this.seasonalData[firstPlaceKey]['Sum'],
                    'LTM': this.placeData[firstPlaceKey]['LTM'],
                    'LTA': this.placeData[firstPlaceKey]['LTA'],
                    'LTA±20%': arrayMoreLess20(this.placeData[firstPlaceKey]['LTA']),
                    'LTA±St. Dev.': [getLast(this.placeData[firstPlaceKey]['LTA']) + getLast(this.placeData[firstPlaceKey]['St. Dev.']),
                    getLast(this.placeData[firstPlaceKey]['LTA']) - getLast(this.placeData[firstPlaceKey]['St. Dev.']),
                    ],
                    '(33, 67) Pctl.': [this.placeData[firstPlaceKey]['Pctls.'][0],
                    this.placeData[firstPlaceKey]['Pctls.'][1]
                    ],
                },
                // regions: {
                //     '1981': [{ style: { dasharray: "6 2" } }]
                // }
                types: {
                    'LTA±20%': 'area-line-range',
                    'LTA±St. Dev.': 'scatter',
                    '(33, 67) Pctl.': 'scatter',
                },
                colors: {
                    'LTA': '#ff0000',
                    'LTA±20%': '#ff0000',
                },
            },
            size: {
                width: containerWidth,
                height: containerWidth * (9 / 16)
            },
            ...options
        });
        this.plot.xs({
            'LTA±St. Dev.': [35, 35],
            '(33, 67) Pctl.': [35, 35],
        });
        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }
    update(index) {
        this.plot.load({
            json: {
                ...this.seasonalData[index]['Sum'],
                'LTM': this.placeData[index]['LTM'],
                'LTA': this.placeData[index]['LTA'],
                'LTA±20%': arrayMoreLess20(this.placeData[index]['LTA']),
                'LTA±St. Dev.': [getLast(this.placeData[index]['LTA']) + getLast(this.placeData[index]['St. Dev.']),
                getLast(this.placeData[index]['LTA']) - getLast(this.placeData[index]['St. Dev.']),
                ],
                '(33, 67) Pctl.': [this.placeData[index]['Pctls.'][0],
                this.placeData[index]['Pctls.'][1]
                ],
            }
        });
        this.plot.xs({
            'LTA±St. Dev.': [35, 35],
            '(33, 67) Pctl.': [35, 35],
        });
    }
}

class EnsembleBillboardChart {
    constructor(seasonalData, placeData, yearNames, columnNames, containerElement) {
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.columnNames = columnNames;
        this.containerElement = containerElement;
        this.currentLength = this.placeData[firstPlaceKey]['Current Year'].length - 1;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'), 10);
        let options = {
            axis: {
                x: {
                    // type: 'category',
                    min: .5,
                    label: {
                        text: 'Time',
                        position: 'outer-right',
                    },
                    tick: {
                        rotate: -35,
                        culling: {max: '13'},
                        multiline: false,
                        format: function (i) {
                            return columnNames[i];
                        }
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
                    show: true
                }
            },
            legend: {
                show: true,
                // usePoint: true,
            },
            tooltip: {
                format: {
                    value: function(value, ratio, id) {
                        return Math.round(value);
                    }
                }
            },
            point: {
                // show: false,
                pattern: [
                    'circle',
                    "<polygon points='4 0 0 8 8 8'></polygon>",
                    'rectangle',
                ]
            },
            transition: {
                duration: false,
            },
            line: {
                point: false
            }
        };
        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {
                json: {
                    ...this.seasonalData[firstPlaceKey]['Ensemble Sum'],
                    'E. LTM': this.placeData[firstPlaceKey]['E. LTM'],
                    'LTA': this.placeData[firstPlaceKey]['LTA'],
                    'LTA±20%': arrayMoreLess20(this.placeData[firstPlaceKey]['LTA']),
                    'LTA±St. Dev.': [getLast(this.placeData[firstPlaceKey]['LTA']) + getLast(this.placeData[firstPlaceKey]['St. Dev.']),
                    getLast(this.placeData[firstPlaceKey]['LTA']) - getLast(this.placeData[firstPlaceKey]['St. Dev.']),
                    ],
                    '(33, 67) Pctl.': [this.placeData[firstPlaceKey]['Pctls.'][0],
                    this.placeData[firstPlaceKey]['Pctls.'][1]
                    ],
                    'E. (33, 67) Pctl.': [this.placeData[firstPlaceKey]['E. Pctls.'][0],
                    this.placeData[firstPlaceKey]['E. Pctls.'][1]
                    ],
                },
                // regions: {
                //     '1981': [{ style: { dasharray: "6 2" } }]
                // }
                types: {
                    'LTA±20%': 'area-line-range',
                    'LTA±St. Dev.': 'scatter',
                    '(33, 67) Pctl.': 'scatter',
                    'E. (33, 67) Pctl.': 'scatter',
                },
                colors: {
                    'LTA': '#ff0000',
                    'LTA±20%': '#ff0000',
                    'E. LTM': '#000000',
                },
            },
            size: {
                width: containerWidth,
                height: containerWidth * (9 / 16)
            },
            ...options
        });
        this.plot.xs({
            'LTA±St. Dev.': [35, 35],
            '(33, 67) Pctl.': [35, 35],
            'E. (33, 67) Pctl.': [35, 35],
        });
        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }
    update(index) {
        this.plot.load({
            json: {
                ...this.seasonalData[index]['Ensemble Sum'],
                'E. LTM': this.placeData[index]['E. LTM'],
                'LTA': this.placeData[index]['LTA'],
                'LTA±20%': arrayMoreLess20(this.placeData[index]['LTA']),
                'LTA±St. Dev.': [getLast(this.placeData[index]['LTA']) + getLast(this.placeData[index]['St. Dev.']),
                getLast(this.placeData[index]['LTA']) - getLast(this.placeData[index]['St. Dev.']),
                ],
                '(33, 67) Pctl.': [this.placeData[index]['Pctls.'][0],
                this.placeData[index]['Pctls.'][1]
                ],
                'E. (33, 67) Pctl.': [this.placeData[index]['E. Pctls.'][0],
                this.placeData[index]['E. Pctls.'][1]
                ],
            }
        });
        this.plot.xs({
            'LTA±St. Dev.': [35, 35],
            '(33, 67) Pctl.': [35, 35],
            'E. (33, 67) Pctl.': [35, 35],
        });
    }
}

class CurrentBillboardChart {
    constructor(seasonalData, placeData, columnNames, containerElement) {
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.containerElement = containerElement;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'), 10);
        let options = {
            axis: {
                x: {
                    type: 'category',
                    categories: columnNames,
                    min: .5,
                    label: {
                        text: 'Time',
                        position: 'outer-right',
                    },
                    tick: {
                        rotate: -35,
                        multiline: false
                    },
                },
                y: {
                    min: 0,
                    label: {
                        text: 'Rainfall (mm)',
                        position: 'outer-top',
                    },
                    padding: {
                        bottom: 0
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
                    show: true
                }
            },
            legend: {
                show: true,
                // usePoint: true
            },
            point: {
                show: false,
                pattern: ['circle',]
            },
            transition: {
                duration: false,
            },
        };

        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {
                json: {
                    'Current Year': this.placeData[firstPlaceKey]['Current Year'],
                    'Avg.': this.placeData[firstPlaceKey]['Avg.'],
                },
                // regions: {
                //     '1981': [{ style: { dasharray: "6 2" } }]
                // }
                types: {
                    'Current Year': 'bar',
                },
                colors: {
                    'Avg.': '#ff0000',
                },
            },
            size: {
                width: containerWidth,
                height: containerWidth * (9 / 16)
            },
            ...options
        });

        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }

    update(index) {
        this.plot.load({
            json: {
                'Current Year': this.placeData[index]['Current Year'],
                'Avg.': this.placeData[index]['Avg.'],
            }
        });
    }
}

class SeasonalAccumulationsBillboardChart {
    constructor(seasonalData, placeData, columnNames, containerElement) {
        this.columnNames = columnNames;
        this.seasonalData = seasonalData;
        this.placeData = placeData;
        this.containerElement = containerElement;
        this.currentLength = this.placeData[firstPlaceKey]['Current Year'].length - 1;
        let containerWidth = parseInt(d3.select(this.containerElement).style('width'), 10);
        let options = {
            axis: {
                x: {
                    type: 'category',
                    categories: columnNames,
                    min: .5,
                    label: {
                        text: 'Time',
                        position: 'outer-right',
                    },
                    tick: {
                        rotate: -35,
                        multiline: false
                    },
                },
                y: {
                    min: 0,
                    label: {
                        text: 'Rainfall (mm)',
                        position: 'outer-top',
                    },
                    padding: {
                        bottom: 0
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
                    show: true
                }
            },
            legend: {
                show: true,
                // usePoint: true
            },
            point: {
                show: false,
                pattern: ['circle',]
            },
            transition: {
                duration: false,
            },
        };

        this.plot = bb.generate({
            bindto: this.containerElement,
            data: {
                json: {
                    'Seasonal Accumulation': getUpTo(this.seasonalData[firstPlaceKey]['Sum'], this.currentLength - 1),
                    'Avg.': extendScalar(this.placeData[firstPlaceKey]['LTA'][this.currentLength - 1], this.columnNames.length),
                    'D0: 31 Pctl.': extendScalar(this.placeData[firstPlaceKey]['Drought Severity Pctls.'][4], this.columnNames.length),
                    'D1: 21 Pctl.': extendScalar(this.placeData[firstPlaceKey]['Drought Severity Pctls.'][3], this.columnNames.length),
                    'D2: 11 Pctl.': extendScalar(this.placeData[firstPlaceKey]['Drought Severity Pctls.'][2], this.columnNames.length),
                    'D3: 6 Pctl.': extendScalar(this.placeData[firstPlaceKey]['Drought Severity Pctls.'][1], this.columnNames.length),
                    'D4: 3 Pctl.': extendScalar(this.placeData[firstPlaceKey]['Drought Severity Pctls.'][0], this.columnNames.length),
                },
                // regions: {
                //     '1981': [{ style: { dasharray: "6 2" } }]
                // }
                types: {
                    'Seasonal Accumulation': 'bar',
                    'Avg': 'line',
                    'D4: 3 Pctl.': 'area',
                    'D3: 6 Pctl.': 'area',
                    'D2: 11 Pctl.': 'area',
                    'D1: 21 Pctl.': 'area',
                    'D0: 31 Pctl.': 'area',
                },
                colors: {
                    'Avg.': '#ff0000',
                },
            },
            groups: [
                ['D4: 3 Pctl.', 'D3: 6 Pctl.', 'D2: 11 Pctl.', 'D1: 21 Pctl.', 'D0: 31 Pctl.',]
            ],
            size: {
                width: containerWidth,
                height: containerWidth * (9 / 16)
            },
            bar: {
                // front: true,
            },
            ...options
        });

        window.addEventListener('resize', () => onResize(containerElement, this.plot));
    }

    update(index) {
        this.plot.load({
            json: {
                'Seasonal Accumulation': getUpTo(this.seasonalData[index]['Sum'], this.currentLength - 1),
                'Avg.': extendScalar(this.placeData[index]['LTA'][this.currentLength - 1], this.columnNames.length),
                'D0: 31 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][4], this.columnNames.length),
                'D1: 21 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][3], this.columnNames.length),
                'D2: 11 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][2], this.columnNames.length),
                'D3: 6 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][1], this.columnNames.length),
                'D4: 3 Pctl.': extendScalar(this.placeData[index]['Drought Severity Pctls.'][0], this.columnNames.length),
            }
        });
    }
}
