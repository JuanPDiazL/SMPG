// This file contains the map legends, as JSON data: each legend's classes, in order, with their
// label and color, and the values they take. A class takes a value equal to its "value", or one
// between its "min" and "max" (either can be left out); "min" is included and "max" isn't, unless
// "minIncluded" or "maxIncluded" say otherwise (on the class, or on the legend for all its
// classes). A class with neither takes every value. makeMap.js builds them (getMapLegend()) and
// gives each map statistic its legend (mapStatsCategories).

"use strict";

const MAP_LEGENDS = {
    "none": { "classes": [
        { "label": "Uncategorized", "color": "#aaaf" }
    ] },
    "pct-of-average": { "classes": [
        { "label": "0-20", "color": "#be6b05", "min": 0, "max": 20 },
        { "label": "20-40", "color": "#f38124", "min": 20, "max": 40 },
        { "label": "40-60", "color": "#fec280", "min": 40, "max": 60 },
        { "label": "60-80", "color": "#ffe69e", "min": 60, "max": 80 },
        { "label": "80-90", "color": "#fff9a3", "min": 80, "max": 90 },
        { "label": "90-110", "color": "#e0e0e0", "min": 90, "max": 110 },
        { "label": "110-120", "color": "#c6eab3", "min": 110, "max": 120 },
        { "label": "120-140", "color": "#56cd94", "min": 120, "max": 140 },
        { "label": "140-160", "color": "#5cc9ea", "min": 140, "max": 160 },
        { "label": "≥160", "color": "#2a83ba", "min": 160 }
    ] },
    "rainfall-total": { "classes": [
        { "label": "0-10", "color": "#E1E1E1", "min": 0, "max": 10 },
        { "label": "10-50", "color": "#FBEEDD", "min": 10, "max": 50 },
        { "label": "50-100", "color": "#F4D1A2", "min": 50, "max": 100 },
        { "label": "100-150", "color": "#FFB062", "min": 100, "max": 150 },
        { "label": "150-200", "color": "#E4E28F", "min": 150, "max": 200 },
        { "label": "200-250", "color": "#D0CD3C", "min": 200, "max": 250 },
        { "label": "250-300", "color": "#B5FFAD", "min": 250, "max": 300 },
        { "label": "300-400", "color": "#7BF773", "min": 300, "max": 400 },
        { "label": "400-500", "color": "#31DD39", "min": 400, "max": 500 },
        { "label": "500-750", "color": "#31C639", "min": 500, "max": 750 },
        { "label": "750-1000", "color": "#B5F7FF", "min": 750, "max": 1000 },
        { "label": "1000-1250", "color": "#52A5F7", "min": 1000, "max": 1250 },
        { "label": "1250-1500", "color": "#186BEF", "min": 1250, "max": 1500 },
        { "label": "1500-2000", "color": "#2600FF", "min": 1500, "max": 2000 },
        { "label": "≥2000", "color": "#000080", "min": 2000 }
    ] },
    "probability-below-normal": { "classes": [
        { "label": "0-15", "color": "#2b83ba", "min": 0, "max": 15 },
        { "label": "15-30", "color": "#74b7ae", "min": 15, "max": 30 },
        { "label": "30-45", "color": "#e7f6b8", "min": 30, "max": 45 },
        { "label": "45-60", "color": "#ffe8a4", "min": 45, "max": 60 },
        { "label": "60-75", "color": "#feba6e", "min": 60, "max": 75 },
        { "label": "75-90", "color": "#ed6e43", "min": 75, "max": 90 },
        { "label": "90-100", "color": "#d7191c", "min": 90, "max": 100, "maxIncluded": true }
    ] },
    "probability-normal-or-above": { "classes": [
        { "label": "0-20", "color": "#e0e0e0", "min": 0, "max": 20 },
        { "label": "20-40", "color": "#f0f9e8", "min": 20, "max": 40 },
        { "label": "40-60", "color": "#bae4bc", "min": 40, "max": 60 },
        { "label": "60-80", "color": "#7bccc4", "min": 60, "max": 80 },
        { "label": "80-90", "color": "#43a2ca", "min": 80, "max": 90 },
        { "label": "90-100", "color": "#0868ac", "min": 90, "max": 100, "maxIncluded": true }
    ] },
    "percentile-classes": { "minIncluded": false, "maxIncluded": true, "classes": [
        { "label": "Exceptionally Dry", "color": "#7e0006", "max": 2 },
        { "label": "Extremely Dry", "color": "#e20b00", "min": 2, "max": 5 },
        { "label": "Severely Dry", "color": "#e35a1a", "min": 5, "max": 10 },
        { "label": "Moderately Dry", "color": "#faaf00", "min": 10, "max": 20 },
        { "label": "Abnormally Dry", "color": "#faff0f", "min": 20, "max": 30 },
        { "label": "Normal", "color": "#e0e0e0", "min": 30, "max": 70 },
        { "label": "Wetter than Normal", "color": "#a6cee3", "min": 70, "max": 90 },
        { "label": "Extremely Wet", "color": "#1f78b4", "min": 90 }
    ] },
    "sos-anomaly": { "classes": [
        { "label": "Yet to Start", "color": "#FFF77D", "value": "Yet to Start" },
        { "label": "≥4 Dk. Early", "color": "#004280", "value": "≥4 Dekads Early" },
        { "label": "3 Dk. Early", "color": "#0073F0", "value": "3 Dekads Early" },
        { "label": "2 Dk. Early", "color": "#008FF5", "value": "2 Dekads Early" },
        { "label": "1 Dk. Early", "color": "#00A6F5", "value": "1 Dekads Early" },
        { "label": "Average", "color": "#CCCCCC", "value": "Average" },
        { "label": "1 Dk. Late", "color": "#FFD4E6", "value": "1 Dekads Late" },
        { "label": "2 Dk. Late", "color": "#FFC78F", "value": "2 Dekads Late" },
        { "label": "3 Dk. Late", "color": "#FF734A", "value": "3 Dekads Late" },
        { "label": "≥4 Dk. Late", "color": "#BA0070", "value": "≥4 Dekads Late" }
    ] }
};
