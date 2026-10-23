// This file contains utility functions and options for the plots

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
    if (datasetProperties.selected_years.length > 10 
        && datasetProperties.selected_years.includes(title)) {
        return "";
    }
    return `<span style='padding:2px; font-size:10.5px;'><span class="mi mi-button" style="color:${color};">${chartType}</span> ${title}</span>`;
}

const globalBBChartDefaultOptions = {
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
    tooltip: {
        order: 'desc',
        grouped: true,
        format: { value: function (value, ratio, id) { return Math.round(value); }, },
        position: function (data, width, height, element, pos) {
            // get root svg from element
            let svg = element;
            while (svg && svg.tagName !== 'svg') {
                svg = svg.parentElement;
            }
            // use d3 to get properties of root svg
            svg = d3.select(svg);
            const viewBox = svg.attr('viewBox').split(' ').map(Number);
            const svgRect = svg.node().getBoundingClientRect();
            // calculate final coordinates, in the window: the tooltip is fixed (see plots.css), so
            // it isn't cut off by its card
            const scaleX = svgRect.width / viewBox[2];
            const scaleY  = svgRect.height / viewBox[3];
            let left = svgRect.left + pos.xAxis * scaleX;
            let top = svgRect.top + pos.y * scaleY;
            // avoid out of bounds: flip to the other side of the pointer, then keep it in the window
            const margin = 4;
            const maxLeft = window.innerWidth - width - margin;
            const maxTop = window.innerHeight - height - margin;
            if (left > maxLeft) { left -= width; }
            if (top > maxTop) { top -= height; }
            left = Math.max(margin, Math.min(left, maxLeft));
            top = Math.max(margin, Math.min(top, maxTop));

            return {
                top: top,
                left: left
            };
        },
    },
    point: {
        show: true,
    },
    transition: {
        duration: false,
    },
    line: {
        point: false,
    },
    area: {
        front: false,
        zerobased: true,
    },
    padding: {
        mode: 'fit',
    },
    bar: {
        front: true,
    },
    resize: {
        auto: "viewBox",
    },
};
const chartColors = {
    'LTA': '#FF0000',
    'Median': '#000000',
    'LTA±20%': '#00AFE5',
    'Climatology Average': '#FF0000',
    'Ensemble Med.': '#000000',
    'Ensemble Med. w. Forecast': '#000000',
    'Current Season': '#0000FF',
    'Seasonal Accumulation': '#78ADD2',
    'Current Season Accumulation': '#0000FF',
    'Current Season Accumulation with Forecast': '#0000FF',
    'Current Accumulation to Present': '#0000FF',
    'Current Accumulation to Forecast': '#FF00FF',
    'Forecast': '#FF00FF',
    'Forecast Accumulation': '#FF00FF',
    'Seasonal Accumulation to Forecast': '#2A7E41',
    

    '67 Pctl.': '#00FF00',
    'D0: 31 Pctl.': '#FFFF00',
    'D1: 21 Pctl.': '#FCD37F',
    'D2: 11 Pctl.': '#FFAA00',
    'D3: 6 Pctl.': '#E60000',
    'D4: 3 Pctl.': '#730000',

    'LTA±St. Dev.': '#008000',
    '(33, 67) Pctl.': '#000000',
    'E. LTA±St. Dev.': '#FFA500',
    'E. LTA w. Forecast±St. Dev.': '#FFA500',
    'E. (33, 67) Pctl.': '#0000FF',
    'E. w. Forecast (33, 67) Pctl.': '#0000FF',
}

// Year series' colors, in the order the years get them. Each has at least 3:1 contrast on the
// light and the dark-mode chart backgrounds and stays clear of the fixed colors above; the most
// similar ones are 6 places apart.
const YEAR_COLORS = [
    '#00897B', '#EC407A', '#5C6BC0', '#827717', '#AB47BC', '#8D6E63',
    '#00838F', '#F06292', '#9575CD', '#78909C', '#BA68C8', '#A1887F',
];
const plotColorCache = new Map();

/**
 * Returns a series' color, the same in every chart: its fixed color from chartColors, a year's
 * color from YEAR_COLORS (the selected years first, then the rest, in year order), or for any
 * other name a YEAR_COLORS color chosen from the name itself.
 * @param {string} name - The series' name, e.g. "LTA" or "1994-1995".
 * @returns {string} The color.
 */
function getPlotColor(name) {
    if (name in chartColors) { return chartColors[name]; }
    if (!plotColorCache.has(name)) {
        // the selected years are a list, or a number of similar years that differ per place
        const selected = Array.isArray(datasetProperties.selected_years) ? datasetProperties.selected_years : [];
        const years = [...selected, ...datasetProperties.year_ids.filter((year) => !selected.includes(year))];
        let index = years.indexOf(name);
        if (index < 0) {
            // not a year: a stable hash of the name
            index = 0;
            for (const char of name) { index = (index * 31 + char.codePointAt(0)) >>> 0; }
        }
        plotColorCache.set(name, YEAR_COLORS[index % YEAR_COLORS.length]);
    }
    return plotColorCache.get(name);
}
