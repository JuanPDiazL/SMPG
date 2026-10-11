// This file contains the code to construct the map

"use strict";

const UNCAT_COLOR = '#aaaf';
let mapStatsCategories = {
    'None': { 'Uncategorized': {color:UNCAT_COLOR, 'function': () => true} },
    'Total up to Current Period Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Current Accumulation to Present': {
        '0-10': { 'color': '#E1E1E1', 'function': (x) => x >= 0 && x < 10 },
        '10-50': { 'color': '#FBEEDD', 'function': (x) => x >= 10 && x < 50 },
        '50-100': { 'color': '#F4D1A2', 'function': (x) => x >= 50 && x < 100 },
        '100-150': { 'color': '#FFB062', 'function': (x) => x >= 100 && x < 150 },
        '150-200': { 'color': '#E4E28F', 'function': (x) => x >= 150 && x < 200 },
        '200-250': { 'color': '#D0CD3C', 'function': (x) => x >= 200 && x < 250 },
        '250-300': { 'color': '#B5FFAD', 'function': (x) => x >= 250 && x < 300 },
        '300-400': { 'color': '#7BF773', 'function': (x) => x >= 300 && x < 400 },
        '400-500': { 'color': '#31DD39', 'function': (x) => x >= 400 && x < 500 },
        '500-750': { 'color': '#31C639', 'function': (x) => x >= 500 && x < 750 },
        '750-1000': { 'color': '#B5F7FF', 'function': (x) => x >= 750 && x < 1000 },
        '1000-1250': { 'color': '#52A5F7', 'function': (x) => x >= 1000 && x < 1250 },
        '1250-1500': { 'color': '#186BEF', 'function': (x) => x >= 1250 && x < 1500 },
        '1500-2000': { 'color': '#2600FF', 'function': (x) => x >= 1500 && x < 2000 },
        '≥2000': { 'color': '#000080', 'function': (x) => x >= 2000 },
    },
    'Average Total': {
        '0-10': { 'color': '#E1E1E1', 'function': (x) => x >= 0 && x < 10 },
        '10-50': { 'color': '#FBEEDD', 'function': (x) => x >= 10 && x < 50 },
        '50-100': { 'color': '#F4D1A2', 'function': (x) => x >= 50 && x < 100 },
        '100-150': { 'color': '#FFB062', 'function': (x) => x >= 100 && x < 150 },
        '150-200': { 'color': '#E4E28F', 'function': (x) => x >= 150 && x < 200 },
        '200-250': { 'color': '#D0CD3C', 'function': (x) => x >= 200 && x < 250 },
        '250-300': { 'color': '#B5FFAD', 'function': (x) => x >= 250 && x < 300 },
        '300-400': { 'color': '#7BF773', 'function': (x) => x >= 300 && x < 400 },
        '400-500': { 'color': '#31DD39', 'function': (x) => x >= 400 && x < 500 },
        '500-750': { 'color': '#31C639', 'function': (x) => x >= 500 && x < 750 },
        '750-1000': { 'color': '#B5F7FF', 'function': (x) => x >= 750 && x < 1000 },
        '1000-1250': { 'color': '#52A5F7', 'function': (x) => x >= 1000 && x < 1250 },
        '1250-1500': { 'color': '#186BEF', 'function': (x) => x >= 1250 && x < 1500 },
        '1500-2000': { 'color': '#2600FF', 'function': (x) => x >= 1500 && x < 2000 },
        '≥2000': { 'color': '#000080', 'function': (x) => x >= 2000 },
    },
    'Current Period Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Forecast 1st Period Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Forecast 2nd Period Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Forecast 3rd Period Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Forecast Accumulation Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Total up to Forecast Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Forecast Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Ensemble Med. Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Ensemble Med. w Forecast Pct. of Avg.': {
        '0-20': { 'color': '#be6b05', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f38124', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#fec280', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#ffe69e', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#fff9a3', 'function': (x) => x >= 80 && x < 90 },
        '90-110': { 'color': '#e0e0e0', 'function': (x) => x >= 90 && x < 110 },
        '110-120': { 'color': '#c6eab3', 'function': (x) => x >= 110 && x < 120 },
        '120-140': { 'color': '#56cd94', 'function': (x) => x >= 120 && x < 140 },
        '140-160': { 'color': '#5cc9ea', 'function': (x) => x >= 140 && x < 160 },
        '≥160': { 'color': '#2a83ba', 'function': (x) => x >= 160 },
    },
    'Probability Below Normal': {
        '0-15': { 'color': '#2b83ba', 'function': (x) => x >= 0 && x < 15 },
        '15-30': { 'color': '#74b7ae', 'function': (x) => x >= 15 && x < 30 },
        '30-45': { 'color': '#e7f6b8', 'function': (x) => x >= 30 && x < 45 },
        '45-60': { 'color': '#ffe8a4', 'function': (x) => x >= 45 && x < 60 },
        '60-75': { 'color': '#feba6e', 'function': (x) => x >= 60 && x < 75 },
        '75-90': { 'color': '#ed6e43', 'function': (x) => x >= 75 && x < 90 },
        '90-100': { 'color': '#d7191c', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Below Normal w. Forecast': {
        '0-15': { 'color': '#2b83ba', 'function': (x) => x >= 0 && x < 15 },
        '15-30': { 'color': '#74b7ae', 'function': (x) => x >= 15 && x < 30 },
        '30-45': { 'color': '#e7f6b8', 'function': (x) => x >= 30 && x < 45 },
        '45-60': { 'color': '#ffe8a4', 'function': (x) => x >= 45 && x < 60 },
        '60-75': { 'color': '#feba6e', 'function': (x) => x >= 60 && x < 75 },
        '75-90': { 'color': '#ed6e43', 'function': (x) => x >= 75 && x < 90 },
        '90-100': { 'color': '#d7191c', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability of Normal': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability of Normal w. Forecast': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Above Normal': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Probability Above Normal w. Forecast': {
        '0-20': { 'color': '#e0e0e0', 'function': (x) => x >= 0 && x < 20 },
        '20-40': { 'color': '#f0f9e8', 'function': (x) => x >= 20 && x < 40 },
        '40-60': { 'color': '#bae4bc', 'function': (x) => x >= 40 && x < 60 },
        '60-80': { 'color': '#7bccc4', 'function': (x) => x >= 60 && x < 80 },
        '80-90': { 'color': '#43a2ca', 'function': (x) => x >= 80 && x < 90 },
        '90-100': { 'color': '#0868ac', 'function': (x) => x >= 90 && x <= 100 },
    },
    'Ensemble Med. Pctl.': {
        'Exceptionally Dry': { 'color': '#7e0006', 'function': (x) => x <= 2 },
        'Extremely Dry': { 'color': '#e20b00', 'function': (x) => x > 2 && x <= 5 },
        'Severely Dry': { 'color': '#e35a1a', 'function': (x) => x > 5 && x <= 10 },
        'Moderately Dry': { 'color': '#faaf00', 'function': (x) => x > 10 && x <= 20 },
        'Abnormally Dry': { 'color': '#faff0f', 'function': (x) => x > 20 && x <= 30 },
        'Normal': { 'color': '#e0e0e0', 'function': (x) => x > 30 && x <= 70 },
        'Wetter than Normal': { 'color': '#a6cee3', 'function': (x) => x > 70 && x <= 90 },
        'Extremely Wet': { 'color': '#1f78b4', 'function': (x) => x > 90 },
    },
    'Ensemble Med. Pctl. w. Forecast': {
        'Exceptionally Dry': { 'color': '#7e0006', 'function': (x) => x <= 2 },
        'Extremely Dry': { 'color': '#e20b00', 'function': (x) => x > 2 && x <= 5 },
        'Severely Dry': { 'color': '#e35a1a', 'function': (x) => x > 5 && x <= 10 },
        'Moderately Dry': { 'color': '#faaf00', 'function': (x) => x > 10 && x <= 20 },
        'Abnormally Dry': { 'color': '#faff0f', 'function': (x) => x > 20 && x <= 30 },
        'Normal': { 'color': '#e0e0e0', 'function': (x) => x > 30 && x <= 70 },
        'Wetter than Normal': { 'color': '#a6cee3', 'function': (x) => x > 70 && x <= 90 },
        'Extremely Wet': { 'color': '#1f78b4', 'function': (x) => x > 90 },
    },
    'Current Season Pctl.': {
        'Exceptionally Dry': { 'color': '#7e0006', 'function': (x) => x <= 2 },
        'Extremely Dry': { 'color': '#e20b00', 'function': (x) => x > 2 && x <= 5 },
        'Severely Dry': { 'color': '#e35a1a', 'function': (x) => x > 5 && x <= 10 },
        'Moderately Dry': { 'color': '#faaf00', 'function': (x) => x > 10 && x <= 20 },
        'Abnormally Dry': { 'color': '#faff0f', 'function': (x) => x > 20 && x <= 30 },
        'Normal': { 'color': '#e0e0e0', 'function': (x) => x > 30 && x <= 70 },
        'Wetter than Normal': { 'color': '#a6cee3', 'function': (x) => x > 70 && x <= 90 },
        'Extremely Wet': { 'color': '#1f78b4', 'function': (x) => x > 90 },
    },
    'Forecast Pctl.': {
        'Exceptionally Dry': { 'color': '#7e0006', 'function': (x) => x <= 2 },
        'Extremely Dry': { 'color': '#e20b00', 'function': (x) => x > 2 && x <= 5 },
        'Severely Dry': { 'color': '#e35a1a', 'function': (x) => x > 5 && x <= 10 },
        'Moderately Dry': { 'color': '#faaf00', 'function': (x) => x > 10 && x <= 20 },
        'Abnormally Dry': { 'color': '#faff0f', 'function': (x) => x > 20 && x <= 30 },
        'Normal': { 'color': '#e0e0e0', 'function': (x) => x > 30 && x <= 70 },
        'Wetter than Normal': { 'color': '#a6cee3', 'function': (x) => x > 70 && x <= 90 },
        'Extremely Wet': { 'color': '#1f78b4', 'function': (x) => x > 90 },
    },
    'Start of Season Anomaly': {
        'Yet to Start': { 'color': '#FFF77D', 'function': (x) => x === 'Yet to Start'},
        '≥4 Dk. Early': { 'color': '#004280', 'function': (x) => x === '≥4 Dekads Early' },
        '3 Dk. Early': { 'color': '#0073F0', 'function': (x) => x === '3 Dekads Early' },
        '2 Dk. Early': { 'color': '#008FF5', 'function': (x) => x === '2 Dekads Early' },
        '1 Dk. Early': { 'color': '#00A6F5', 'function': (x) => x === '1 Dekads Early' },
        'Average': { 'color': '#CCCCCC', 'function': (x) => x === 'Average' },
        '1 Dk. Late': { 'color': '#FFD4E6', 'function': (x) => x === '1 Dekads Late' },
        '2 Dk. Late': { 'color': '#FFC78F', 'function': (x) => x === '2 Dekads Late' },
        '3 Dk. Late': { 'color': '#FF734A', 'function': (x) => x === '3 Dekads Late' },
        '≥4 Dk. Late': { 'color': '#BA0070', 'function': (x) => x === '≥4 Dekads Late' },
    },
    'Forecast Start of Season Anomaly': {
        'Yet to Start': { 'color': '#FFF77D', 'function': (x) => x === 'Yet to Start'},
        '≥4 Dk. Early': { 'color': '#004280', 'function': (x) => x === '≥4 Dekads Early' },
        '3 Dk. Early': { 'color': '#0073F0', 'function': (x) => x === '3 Dekads Early' },
        '2 Dk. Early': { 'color': '#008FF5', 'function': (x) => x === '2 Dekads Early' },
        '1 Dk. Early': { 'color': '#00A6F5', 'function': (x) => x === '1 Dekads Early' },
        'Average': { 'color': '#CCCCCC', 'function': (x) => x === 'Average' },
        '1 Dk. Late': { 'color': '#FFD4E6', 'function': (x) => x === '1 Dekads Late' },
        '2 Dk. Late': { 'color': '#FFC78F', 'function': (x) => x === '2 Dekads Late' },
        '3 Dk. Late': { 'color': '#FF734A', 'function': (x) => x === '3 Dekads Late' },
        '≥4 Dk. Late': { 'color': '#BA0070', 'function': (x) => x === '≥4 Dekads Late' },
    },
};

const mapDescriptions = {
    "Total up to Current Period Pct. of Avg.": "Depicts the percent of the long-term average (LTA) for the accumulated precipitation from the Start of Season (SOS) up to the current period.",
    "C.Dk./LTA PC.Dk. + Forecast Pct. of Avg.": "Depicts the percent of average for the accumulated precipitation from the Start of Season (SOS) up to the current period, including the forecast.",
    "Current Season Pctl.": "Shows the percentile rank of the accumulated precipitation from the SOS up to the current period, based on historical data.",
    "Ensemble Med. Pctl.": "Depicts the percentile rank of the median value of all possible outcomes at the End of Season (EOS). The ensemble is created using historical data from selected years (from Section 4) to simulate a range of potential outcomes.",
    "Ensemble Med. Pct. of Avg.": "Displays the percent of average for the EOS median value of all possible outcomes compared against the long-term average (LTA).",
    "Probability Below Normal": "This map displays the probability of the season's outcome below the 33rd percentile of the historical distribution.",
    "Probability of Normal": "This map displays the probability of the season's outcome between the 33rd and 67th percentiles.",
    "Probability Above Normal": "This map displays the probability of the season's outcome above the 67th percentile of the historical distribution.",
    "Start of Season": "These maps show when the start of a rainy season has begun (for instance: Mar-1). The results of these maps depend on the selected method, and its parameters.",
    "Start of Season Anomaly": "This map shows how many periods the Start of season differs from the average (for instance: 2 Dekads Early)."
};

const sosClassColors = [
    '#FFF77D', 
    '#DFD75D', 
    '#6E00C9', 
    '#BF4FE0', 
    '#E3ADF5', 
    '#0094AD', 
    '#21D6FF', 
    '#8CF2FF', 
    '#00BD2E', 
    '#A1FF96', 
    '#A3FFCC', 
    '#F07500', 
    '#FF9126', 
    '#FFB8AB', 
    '#004DA8', 
    '#005CE6', 
    '#0070FF', 
    '#F7E8CC', 
    '#E6C996', 
    '#CFA836', 
    '#966300'
];

function getSosCategories(suffix='Start') {
    let categoryLabels = [`No ${suffix}`, `Possible ${suffix}`]
        .concat(datasetProperties["sub_season_monitoring_ids"]);
    let sizeCategories = Math.min(categoryLabels.length, sosClassColors.length);
    let varCategoryPairs = zip(categoryLabels, sosClassColors);
    
    let _categories = {};
    for (let i=0; i < varCategoryPairs.length; i++) {
        let label = varCategoryPairs[i][0];
        let color = varCategoryPairs[i][1];
        if (i+1 === sizeCategories && sizeCategories < categoryLabels.length) {
            label = `≥${label}`;
        }
        _categories[label] = {'color': color, 'function': (x) => x === label};
    }
    return _categories
}

let getPlaceMapStats = (place) => {
    return {
        'None': () => undefined,
        'Current Accumulation to Present': place_general_stats[place]['Current Accumulation to Present'],
        'Average Total': seasonal_general_stats[place]['LTA'],
        'Current Period Pct. of Avg.': place_general_stats[place]['Current Period Pct. of Avg.'],
        'Forecast 1st Period Pct. of Avg.': place_general_stats[place]['Forecast 1st Period Pct. of Avg.'],
        'Forecast 2nd Period Pct. of Avg.': place_general_stats[place]['Forecast 2nd Period Pct. of Avg.'],
        'Forecast 3rd Period Pct. of Avg.': place_general_stats[place]['Forecast 3rd Period Pct. of Avg.'],
        'Forecast Accumulation Pct. of Avg.': place_general_stats[place]['Forecast Accumulation Pct. of Avg.'],
        'Total up to Current Period Pct. of Avg.': seasonal_general_stats[place]['Total up to Current Period Pct. of Avg.'],
        'Total up to Forecast Pct. of Avg.': seasonal_general_stats[place]['Total up to Forecast Pct. of Avg.'],
        'Ensemble Med. Pct. of Avg.': selected_seasons_general_stats[place]['Ensemble Med. Pct. of Avg.'],
        'Ensemble Med. w Forecast Pct. of Avg.': selected_seasons_general_stats[place]['Ensemble Med. w Forecast Pct. of Avg.'],
        'Probability Below Normal': selected_seasons_general_stats[place]['Probability Below Normal'],
        'Probability Below Normal w. Forecast': selected_seasons_general_stats[place]['Probability Below Normal w. Forecast'],
        'Probability of Normal': selected_seasons_general_stats[place]['Probability of Normal'],
        'Probability of Normal w. Forecast': selected_seasons_general_stats[place]['Probability of Normal w. Forecast'],
        'Probability Above Normal': selected_seasons_general_stats[place]['Probability Above Normal'],
        'Probability Above Normal w. Forecast': selected_seasons_general_stats[place]['Probability Above Normal w. Forecast'],
        'Ensemble Med. Pctl.': selected_seasons_general_stats[place]['Ensemble Med. Pctl.'],
        'Ensemble Med. Pctl. w. Forecast': selected_seasons_general_stats[place]['Ensemble Med. Pctl. w. Forecast'],
        'Current Season Pctl.': place_general_stats[place]['Current Season Pctl.'],
        'Forecast Pctl.': place_general_stats[place]['Forecast Pctl.'],
        'Start of Season': place_general_stats[place]['Start of Season'],
        'Start of Season Anomaly': place_general_stats[place]['Start of Season Anomaly'],
        'Forecast Start of Season': place_general_stats[place]['Forecast Start of Season'],
        'Forecast Start of Season Anomaly': place_general_stats[place]['Forecast Start of Season Anomaly'],
    };
};

// Zooming to a place: the share of the visible map the place fills, the animation's length in
// milliseconds, and the smallest zoom (also the reader's)
const FOCUS_FILL = 0.6;
const FOCUS_DURATION = 750;
const FOCUS_MIN_SCALE = 0.9;
// Map labels show when they fit in their polygon (see d3Map.updateLabelVisibility()): the room
// around the text, in viewBox units, and the largest share of the polygon's area they can cover
const LABEL_PADDING = 3;
const LABEL_MAX_AREA_SHARE = 0.4;

/**
 * Splits a TopoJSON layer's borders among its polygons: each border goes to the first polygon
 * that uses it, so a border shared by two polygons is drawn once. Small paths, one per polygon,
 * draw faster than one path for the whole layer, which the browser redraws whole on every frame.
 * @param {Object} topology - The TopoJSON topology.
 * @param {Object} object - The layer's GeometryCollection in the topology.
 * @returns {Array<Object>} One GeoJSON MultiLineString feature per geometry, in the same order as
 *   topojson.feature() returns the polygons.
 */
function getPolygonBorders(topology, object) {
    const ownedArcs = object.geometries.map(() => []);
    const ownedArcIndexes = new Set();
    object.geometries.forEach((geometry, index) => {
        // Arcs are listed by ring; a negative index (~i) is arc i reversed
        for (const arc of (geometry.arcs ?? []).flat(Infinity)) {
            const arcIndex = arc < 0 ? ~arc : arc;
            if (!ownedArcIndexes.has(arcIndex)) {
                ownedArcIndexes.add(arcIndex);
                ownedArcs[index].push([arcIndex]);
            }
        }
    });
    return ownedArcs.map((arcs) => topojson.feature(topology, { type: "MultiLineString", arcs }));
}

class d3Map {
    /**
     * @param {d3.Selection} containerElement - The element the map is drawn in.
     * @param {Object} geoJsonMap - The places' GeoJSON features.
     * @param {Object} geoJsonReferenceMap - The reference layer's GeoJSON features.
     * @param {Object} borders - Each layer's borders, {map, reference}, from getPolygonBorders().
     * @param {Object} [options] - {label_field, legend_stat, show_legend}.
     */
    constructor(containerElement, geoJsonMap, geoJsonReferenceMap, borders, options={}) {
        this.options = {
            label_field: options.label_field ?? idField,
            legend_stat: options.legend_stat ?? "None",
            show_legend: options.show_legend ?? true,
        };
        this.geoJsonMap = geoJsonMap;
        this.geoJsonReferenceMap = geoJsonReferenceMap;

        this.FONT_SIZE = 13;
        this.internal_width = 800;
        this.internal_height = 800;

        // Create SVG container
        this.svg = containerElement.append("svg")
            .attr("class", "map-svg")
            // .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0, 0, ${this.internal_width}, ${this.internal_height}`)

        this.projection = d3.geoMercator()
        .fitSize([this.internal_width, this.internal_height], geoJsonReferenceMap); // Fit the map to the SVG viewport size

        // Draw the map: each layer's polygons are fills only, under their borders, each drawn once
        const referenceLayer = this.svg.append("g")
            .attr("class", "reference-map-polygons zoomable");
        const referencePolygons = referenceLayer
            .selectAll(".country")
            .data(this.geoJsonReferenceMap.features)
            .enter().append("path")
            .attr("class", "reference-polygon")
            .attr("d", d3.geoPath().projection(this.projection))
            .style("fill", "#ffff")
        referenceLayer.selectAll(".reference-map-borders")
            .data(borders.reference)
            .enter().append("path")
            .attr("class", "reference-map-borders fixed-stroke")
            .attr("d", d3.geoPath().projection(this.projection));

        const placesLayer = this.svg.append("g")
            .attr("class", "map-polygons zoomable");
        this.polygons = placesLayer
            .selectAll(".country")
            .data(this.geoJsonMap.features)
            .enter().append("path")
            .attr("class", d => `country country-${d.properties[idField]} w3-ripple`)
            .attr("d", d3.geoPath().projection(this.projection))
            .on("mouseover", (event, d) => {
                mapSelectorPath
                .attr("d", d3.geoPath().projection(this.projection)(d))
                .style("display", null)
            })
            .on("mouseout", (event, d) => {
                mapSelectorPath
                .style("display", "none")
            })
            // The address change updates the cards, this map included
            .on("click", (event, d) => {
                navigateTo({"place": d.properties[idField]});
            })
        placesLayer.selectAll(".map-borders")
            .data(borders.map)
            .enter().append("path")
            .attr("class", "map-borders fixed-stroke")
            .attr("d", d3.geoPath().projection(this.projection));

        // draw the selected and hovered place outlines, each on a white halo path so it shows on
        // any fill color; each variable holds both paths, which take the same shape
        const persistentSelector = this.svg.append("g")
            .attr("class", "map-persistent-selector zoomable");
        persistentSelector.append("path").attr("class", "selector-halo fixed-stroke");
        persistentSelector.append("path").attr("class", "persistent-selection-path fixed-stroke");
        this.mapPersistentSelectorPath = persistentSelector.selectAll("path");
        const selector = this.svg.append("g")
            .attr("class", "map-selector zoomable");
        selector.append("path").attr("class", "selector-halo fixed-stroke");
        selector.append("path").attr("class", "selection-path fixed-stroke");
        const mapSelectorPath = selector.selectAll("path");

        this.polygonTooltips = this.polygons.append("title")
            .attr("class", "country-polygon-tooltip")
            .text(d => d.properties[this.options.label_field])
            
        // draw labels
        this.labels = this.svg.append("g")
            .attr("class", "map-labels zoomable")
            .selectAll(".map-text-label")
            .data(this.geoJsonMap.features)
            .enter().append("text")
            .text(d => d.properties[this.options.label_field])
            .attr("class", "map-text-label svg-outline-text rescalable")
            .attr("transform", d => `translate(${this.projection(d3.geoCentroid(d))})`)
            .attr("font-size", this.FONT_SIZE)
            .style("dominant-baseline", "middle")
            // .style("text-anchor", "middle")

        this.legend = this.svg.append("g")
            .attr("class", "map-legend");

        // Lines (.fixed-stroke) keep their size on screen through CSS (see map.css), scaled with the
        // map's size by --map-scale, kept current here
        this.resizeObserver = new ResizeObserver(() => this.updateMapScale());
        this.resizeObserver.observe(this.svg.node());

        // Labels keep their size on screen through updates on zoom (see applyZoom()); their
        // initial properties are stored here
        this.svg.selectAll(".rescalable")
            .each(function() {
                d3.select(this).datum(d => ({
                    ...d, 
                    baseStrokeWidth: parseFloat(getComputedStyle(d3.select(this).node()).strokeWidth) || 1,
                    baseFontSize: parseFloat(d3.select(this).attr("font-size")) || this.FONT_SIZE
                }));
            });
            
        // Looked up once, as the zoom handler runs on every frame
        this.zoomables = this.svg.selectAll(".zoomable");
        this.rescalableTexts = this.svg.selectAll("text.rescalable");

        // Each label's polygon size on the map, at zoom 1, for updateLabelVisibility()
        const path = d3.geoPath().projection(this.projection);
        this.labels.each(d => {
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            d.labelSpace = { width: x1 - x0, height: y1 - y0, area: path.area(d) };
        });
        this.measureLabels();
        this.updateLabelVisibility(1);

        // The place last shown, so the map only moves when the place changes (see update())
        this.lastPlace = null;
        // Whether a zoom to a place is running (see focusPlace())
        this.focusing = false;

        // Define the zoom behavior
        this.svgZoomHandler = d3.zoom()
        .filter((event) => {
            // Discard one finger touch events
            if (event.type === "touchstart" && event.touches.length < 2) {
                return false;
            }
            return true;
        })
        // Zooming in goes at least as far as focusPlace() goes for the smallest place
        .scaleExtent([FOCUS_MIN_SCALE, Math.max(8,
            // on the viewBox alone: the SVG's size isn't final yet
            ...Array.from(d3.group(this.geoJsonMap.features, f => f.properties[idField]).values(),
                features => this.getFocusTransform(features, [this.internal_width, this.internal_height]).k))])
        .translateExtent([[this.internal_width*-0.1, this.internal_height*-0.1],
            [this.internal_width*1.1, this.internal_height*1.1]])
        .on('zoom', (event) => this.applyZoom(event.transform));
        this.svg.call(this.svgZoomHandler);

        this.changeLegend(this.options.legend_stat);
        this.changeLegendDisplay(this.options.show_legend);
    }

    /**
     * Applies a zoom transform: moves the map, and keeps labels the same size on screen (lines
     * do through CSS, see updateMapScale()).
     * While focusPlace() animates, labels are hidden and left as they are, so nothing is updated
     * per frame but the map's position.
     * @param {Object} transform - A d3 zoom transform.
     */
    applyZoom(transform) {
        this.zoomables.attr("transform", transform);
        if (!this.svg.classed("map-moving")) {
            this.rescalableTexts
                .attr("font-size", d => d.baseFontSize / transform.k)
                .style("stroke-width", d => d.baseStrokeWidth / transform.k);
            this.updateLabelVisibility(transform.k);
        }
    }

    /**
     * Measures each label's text width at FONT_SIZE, for updateLabelVisibility(). A canvas
     * measures hidden labels too.
     */
    measureLabels() {
        this.labelCanvas = this.labelCanvas ?? document.createElement("canvas").getContext("2d");
        // As .map-text-label in map.css
        this.labelCanvas.font = `${this.FONT_SIZE}px Arial, Helvetica, sans-serif`;
        this.labels.each(d => {
            d.labelWidth = this.labelCanvas.measureText(String(d.properties[this.options.label_field] ?? "")).width;
        });
    }

    /**
     * Shows the labels that fit in their polygon at a zoom level: the label's box (with room for
     * its outline) must fit in the polygon's bounding box, and cover at most LABEL_MAX_AREA_SHARE
     * of the polygon's area, which keeps labels out of thin or irregular polygons. Labels keep
     * their size on screen, so only the polygons grow with the zoom.
     * @param {number} k - The zoom level.
     */
    updateLabelVisibility(k) {
        const height = this.FONT_SIZE + 2 * LABEL_PADDING;
        this.labels.each(function(d) {
            const width = d.labelWidth + 2 * LABEL_PADDING;
            const fits = d.labelWidth > 0
                && width <= k * d.labelSpace.width
                && height <= k * d.labelSpace.height
                && width * height <= LABEL_MAX_AREA_SHARE * k * k * d.labelSpace.area;
            // Only labels that change are touched
            const display = fits ? "" : "none";
            if (this.style.display !== display) {
                this.style.display = display;
            }
        });
    }

    /**
     * Sets --map-scale, the map's drawing scale (screen pixels per viewBox unit), on the SVG. Line
     * widths and dashes are screen sizes (vector-effect: non-scaling-stroke) multiplied by it, so
     * they ignore the zoom but follow the map's size. Called when the map's size changes; a hidden
     * map keeps its last value.
     */
    updateMapScale() {
        const box = this.svg.node().getBoundingClientRect();
        if (box.width === 0 || box.height === 0) { return; }
        // The viewBox is scaled to fit (xMidYMid meet)
        const scale = Math.min(box.width / this.internal_width, box.height / this.internal_height);
        this.svg.style("--map-scale", scale);
    }

    /**
     * Stops watching the map's size. Called when the card is emptied.
     */
    destroy() {
        this.resizeObserver.disconnect();
    }

    /**
     * Returns the visible map's size in viewBox units: the viewBox's, or larger when the map is
     * letterboxed. The viewBox's while the map isn't shown.
     * @returns {Array<number>} [width, height]
     */
    getVisibleSize() {
        const box = this.svg.node().getBoundingClientRect();
        if (box.width === 0 || box.height === 0) {
            return [this.internal_width, this.internal_height];
        }
        // The viewBox is scaled to fit (xMidYMid meet)
        const scale = Math.min(box.width / this.internal_width, box.height / this.internal_height);
        return [box.width / scale, box.height / scale];
    }

    /**
     * Returns the zoom transform that centers a place, filling FOCUS_FILL of the visible map
     * along its limiting dimension.
     * @param {Array<Object>} features - The place's GeoJSON features (a place can have several).
     * @param {Array<number>} [visibleSize] - The visible map's [width, height] in viewBox units,
     *   by default getVisibleSize().
     * @returns {Object} A d3 zoom transform.
     */
    getFocusTransform(features, visibleSize = this.getVisibleSize()) {
        const [visibleWidth, visibleHeight] = visibleSize;
        const [[x0, y0], [x1, y1]] = d3.geoPath().projection(this.projection)
            .bounds({ type: "FeatureCollection", features });
        const k = Math.max(FOCUS_MIN_SCALE, FOCUS_FILL
            * Math.min(visibleWidth / Math.max(x1 - x0, 1e-6), visibleHeight / Math.max(y1 - y0, 1e-6)));
        return d3.zoomIdentity
            .translate(this.internal_width / 2, this.internal_height / 2)
            .scale(k)
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }

    /**
     * Zooms smoothly to a transform (instantly when the reader prefers reduced motion, or when the
     * map isn't shown). A zoom or pan by the reader stops the animation where it is.
     * @param {Object} transform - A d3 zoom transform.
     * @param {Function} [onStop] - Called when the animation ends or is stopped.
     * @returns {boolean} True when it animates, false when it jumped.
     */
    zoomTo(transform, onStop = () => {}) {
        const box = this.svg.node().getBoundingClientRect();
        if (box.width === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            this.svg.call(this.svgZoomHandler.transform, transform);
            return false;
        }
        // Cheaper drawing while moving (see .map-moving in map.css); labels are redone at the end
        const stopMoving = () => {
            this.svg.classed("map-moving", false);
            this.applyZoom(d3.zoomTransform(this.svg.node()));
            onStop();
        };
        this.svg.transition()
            .duration(FOCUS_DURATION)
            .on("start", () => this.svg.classed("map-moving", true))
            .on("end interrupt", stopMoving)
            .call(this.svgZoomHandler.transform, transform);
        return true;
    }

    /**
     * Zooms to a place, see zoomTo(). Until the zoom ends, changing the statistic doesn't reset
     * the view (see changeLegend()).
     * @param {Array<Object>} features - The place's GeoJSON features.
     */
    focusPlace(features) {
        const transform = this.getFocusTransform(features);
        // A letterboxed map can need more zoom than the extent computed at construction
        const [minScale, maxScale] = this.svgZoomHandler.scaleExtent();
        if (transform.k > maxScale) {
            this.svgZoomHandler.scaleExtent([minScale, transform.k]);
        }
        this.focusing = this.zoomTo(transform, () => { this.focusing = false; });
    }

    /**
     * Returns whether the map shows the whole region: zoom 1, not panned.
     * @returns {boolean}
     */
    isViewReset() {
        const { k, x, y } = d3.zoomTransform(this.svg.node());
        return Math.abs(k - 1) < 1e-6 && Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6;
    }

    update(index) {
        // find geojson entry
        const feature = this.geoJsonMap.features.find(f => f.properties[idField] == index);
        
        if (feature) {
            // Zooms to the place when it changes, but not on the map's first update, so the
            // report opens showing the whole region
            if (this.lastPlace !== null && String(this.lastPlace) !== String(index)) {
                this.focusPlace(this.geoJsonMap.features.filter(f => f.properties[idField] == index));
            }
            this.lastPlace = index;
            // Mark current entry on map
            this.mapPersistentSelectorPath
                .attr("d", d3.geoPath().projection(this.projection)(feature))
                .style("display", null)
        }
    }

    changeLegendDisplay(state) {
        this.options.show_legend = state;
        this.legend.classed("w3-hide", this.options.show_legend? null : "none");
    }

    changeLabels(fieldId) {
        // Update label text based on the selected property
        this.options.label_field = fieldId;
        this.labels.text(d => d.properties[this.options.label_field]);
        this.polygonTooltips.text(d => d.properties[this.options.label_field]);
        this.measureLabels();
        this.updateLabelVisibility(d3.zoomTransform(this.svg.node()).k);
    }

    changeLegend(statId) {
        // A new statistic shows the whole region, unless a link is zooming to its place or the
        // map already shows it
        if (statId !== this.options.legend_stat && !this.focusing && !this.isViewReset()) {
            this.zoomTo(d3.zoomIdentity);
        }
        this.options.legend_stat = statId;
        const selectedBins = mapStatsCategories[statId];
        // Update legend based on the selected property
        const legendElementHeight = 16;
        const legendElementGap = 1;
        const startY = this.internal_height - 30;
        const startX = this.internal_width - 30;
        const coordX = startX;
        
        // Update polygon color based on the selected property
        let hasUncategorizedPolygons = false;
        let polygonBins = objectMap(selectedBins, (value, key, obj) => {
            return [];
        });
        this.polygons.style("fill", d => {
            let category = "Uncategorized";

            if (datasetProperties['place_ids'].includes(String(d.properties[idField]))) {
                const value = getPlaceMapStats(d.properties[idField])[statId];
                category = categorizeValue(value, selectedBins);
            }
            // check if there is any uncategorized polygon
            hasUncategorizedPolygons |= (category === "Uncategorized");
            
            if (statId === "None") {
                return UNCAT_COLOR;
            }
            if (category === "Uncategorized") {
                return mapStatsCategories["None"]["color"];
            }
            polygonBins[category].push(d);
            return selectedBins[category]["color"];
        });
        
        if (hasUncategorizedPolygons && statId !== "None") {
            // add a legend for uncategorized polygons
            showModal(`There was missing data when drawing map.<br>Please check for a possible mismatch between the dataset and the selected target field from the shapefile.<br>Target Field: ${parameters.target_id_field}`)
        }

        // Build legend
        const nonEmptyBins = Object.entries(selectedBins).filter(([k, v]) => polygonBins[k].length > 0);
        this.legend.selectChildren().remove()
        if (statId !== "None") {
            this.legend.selectAll().append("g")
                .data(nonEmptyBins)
                .join("g")
                .attr("class", "legend-element")
                .attr("transform", (d, i, nodes) => {
                    const offset = nodes.length - i - 1;
                    const coordY = startY - (offset * (legendElementHeight + legendElementGap));
                    return `translate(${coordX},${coordY})`;
                })
                .call(g => { //populate legend elements
                    g.append("rect")
                        .attr("width", 16)
                        .attr("height", 16)
                        .attr("fill", d => d[1].color);
                        // .attr("stroke", "#000f")
                        // .attr("stroke-width", 1)
                    g.append("text")
                        .attr("class", "legend-labels svg-outline-text")
                        .attr("x", -4)
                        .attr("y", 9)
                        .attr("dy", "0")
                        .attr("font-size", this.FONT_SIZE)
                        .attr("text-anchor", "end")
                        .style("dominant-baseline", "middle")
                        .text(d => d[0]);
                    })
                .call(g => { // add title
                    const offset = g.size() - 1;
                    const coordY = startY - (offset * (legendElementHeight + legendElementGap));
                    this.legend.append("text")
                        .text(statId)
                        .attr("class", "legend-title svg-outline-text")
                        .attr("x", 20)
                        .attr("y", -9)
                        .attr("dy", "0")
                        .attr("font-size", this.FONT_SIZE)
                        .attr("text-anchor", "end")
                        .style("dominant-baseline", "middle")
                        .attr("transform", `translate(${coordX},${coordY})`)
                    })
                .each((d, i, nodes) => {
                    // console.log(nodes[i].getBoundingClientRect().width);
                })
        }
    }

    resize(size=null) {
        size = size || [this.svg.node().parentElement.clientWidth, 
                        this.svg.node().parentElement.clientHeight];
        this.svg.attr('viewBox', `0 0 ${this.internal_width} ${this.internal_height}`);
    }

    getProperties() {
        return this.options;
    }

    /**
     * Applies a patch of options to the map, in the same shape returned by getProperties().
     * @param {Object} properties - A subset of {label_field, legend_stat, show_legend}.
     */
    setProperties(properties) {
        if ("label_field" in properties) {
            this.changeLabels(properties.label_field);
        }
        if ("legend_stat" in properties) {
            this.changeLegend(properties.legend_stat);
        }
        if ("show_legend" in properties) {
            this.changeLegendDisplay(properties.show_legend);
        }
    }
}

function makeD3Map(containerElement) {
    // Prepare categories
    mapStatsCategories["Start of Season"] = getSosCategories(); 
    mapStatsCategories["Forecast Start of Season"] = getSosCategories();

    const map = new d3Map(containerElement, mapJson, referenceMapJson,
        { map: mapBorders, reference: referenceMapBorders });
    return map;
}

class mapControlPanel {
    constructor(containerElement, map, description) {
        this.containerElement = containerElement;
        this.map = map;
        this.description = description;

        this.controlPanelContainer = containerElement.append("div")
            .attr("class", `map-control-panel-container w3-card draggable capture-ignore ${REPORT_EDIT_ONLY_CLASS}`);
        
        // Header
        this.controlPanelHeader = this.controlPanelContainer.append("header")
            .attr("class", "card-header w3-blue-grey drag-handle");
            
        // Buttons
        this.headerButtonGroup = this.controlPanelHeader.append("div");
        this.hideButton = this.headerButtonGroup.append("span").append("button")
            .attr("class", "card-button mi w3-button w3-ripple w3-right capture-ignore")
            .attr("title", "Hide Map Control Panel")
            .text("close")
            .on("click", () => {
                this.controlPanelContainer.classed("w3-hide", true)
            });

        // Title
        this.controlPanelHeader.append("div")
            .attr("class", "card-title-select")
            .append("p")
                .attr("class", "card-title")
                .text("Map Parameters");
        
        // Body
        this.controlPanelBody = this.controlPanelContainer.append("div")
            .attr("class", "w3-container w3-padding-small");

        // Label select
        this.controlPanelBody.append("label")
            .text("Label Field");
        this.labelFieldSelect = this.controlPanelBody.append("select")
            .attr("class", "w3-block w3-border")
            .on("change", (event) => {
                const displayId = event.target.value;
                map.changeLabels(displayId);
            });
        updateSelect(this.labelFieldSelect, property_ids);
        this.labelFieldSelect.property("value", map.options.label_field);

        this.controlPanelBody.append("br");

        // Stat select
        this.controlPanelBody.append("label")
            .text("Legend Stat");
        this.legendStatSelect = this.controlPanelBody.append("select")
            .attr("class", "w3-block w3-border")
            .on("change", (event) => {
                const selectedStatId = event.target.value;
                map.changeLegend(selectedStatId);
                description.changeStat(selectedStatId);
            });
        updateSelect(this.legendStatSelect, mapFields);
        this.legendStatSelect.property("value", map.options.legend_stat);

        // Show legend checkbox
        this.showLegendCheckbox = this.controlPanelBody.append("input")
            .attr("class", "w3-check")
            .attr("type", "checkbox")
            .attr("checked", map.options.show_legend ? "checked" : null)
            .on("change", (event) => {
                const showLegend = event.target.checked;
                map.changeLegendDisplay(showLegend);
            });
        this.controlPanelBody.append("label")
            .text("Show Legend");

        this.controlPanelBody.append("br");

        // Show description checkbox
        this.showDescriptionCheckbox = this.controlPanelBody.append("input")
            .attr("class", "w3-check")
            .attr("type", "checkbox")
            .attr("checked", description.options.show_description ? "checked" : null)
            .on("change", (event) => {
                const state = event.target.checked;
                description.changeVisibility(state);
            });
        this.controlPanelBody.append("label")
            .text("Show Map Description");

        // Reset viewport button
        this.resetViewportButton = this.controlPanelBody.append("button")
            .attr("class", "map-reset-button w3-button w3-input w3-ripple w3-border w3-light-gray w3-hover-blue-grey")
            .text("Reset Map Viewport")
            .on("click", (event) => {
                map.svg.call(map.svgZoomHandler.transform, d3.zoomIdentity);
            });
    }

    update(index) {}

    getProperties() {
        return {}
    }

    /**
     * Re-syncs the control panel's inputs to the map's and description's current option values.
     * Called after the map/description are changed programmatically (e.g. via setProperties()),
     * since their <select>/checkbox inputs are otherwise only set once, at construction time.
     */
    refresh() {
        this.labelFieldSelect.property("value", this.map.options.label_field);
        this.legendStatSelect.property("value", this.map.options.legend_stat);
        this.showLegendCheckbox.property("checked", this.map.options.show_legend);
        this.showDescriptionCheckbox.property("checked", this.description.options.show_description);
    }
}

class mapDescription {
    constructor(containerElement, options={}) {
        this.options = {
            show_description: options.show_description ?? false,
        };

        this.containerElement = containerElement;

        this.mapDescriptionContainer = this.containerElement.append("div")
            .attr("class", "map-description-container w3-margin")
        this.mapDescriptionContainer.classed("w3-hide", !this.options.show_description);

        this.mapDescriptionIcon = this.mapDescriptionContainer.append("span")
            .attr("class", "map-description-icon mi w3-margin-right capture-ignore")
            .text("info")

        this.mapDescriptionText = this.mapDescriptionContainer.append("span").append("p")
           .attr("class", "map-description-text w3-leftbar")
    }

    changeStat(statId) {
        if (!mapDescriptions[statId]) {
            this.mapDescriptionContainer.classed("w3-hide", true);
            this.mapDescriptionText.text("");
            return;
        }
        this.mapDescriptionContainer.classed("w3-hide", !this.options.show_description);
        this.mapDescriptionText.text(mapDescriptions[statId])
    }

    changeVisibility(state) {
        this.options.show_description = state;
        this.mapDescriptionContainer.classed("w3-hide", 
            !this.options.show_description || this.mapDescriptionText.text() === "");
    }

    update(index) {}

    getProperties() {
        return this.options;
    }

    /**
     * Applies a patch of options to the description, in the same shape returned by getProperties().
     * @param {Object} properties - A subset of {show_description}.
     */
    setProperties(properties) {
        if ("show_description" in properties) {
            this.changeVisibility(properties.show_description);
        }
    }
}

function makeMapCard(containerElement) {
    const allContainer = containerElement.append("div")
        .attr("class", "map-container")

    const map = makeD3Map(allContainer);
    const description = new mapDescription(allContainer);
    const controlPanel = new mapControlPanel(allContainer, map, description);
    return {
        "map": map,
        "controlPanel": controlPanel,
        "mapDescription": description,
    };
}