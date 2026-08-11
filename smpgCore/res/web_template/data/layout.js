var layout = {
    general: {
        gridstack: {
            xResolution: 12,
            yResolution: 8,
            widgetWidth: 1/3,
            widgetHeight: 1/2,
        },
    },
    gridstackWidgets: {
        svgMap: {
            smpgOpts: {
                smpgCardType: "Map",
            },
            gridstackOpts: {
                width: 1,
                height: 2,
            },
        },
        accumulations: {
            smpgOpts: {
                smpgCardType: "Seasonal Accumulations",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
        currentYear: {
            smpgOpts: {
                smpgCardType: "Current Year Status",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
        ensemble: {
            smpgOpts: {
                smpgCardType: "Ensemble",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
        seasonalPercentiles: {
            smpgOpts: {
                smpgCardType: "Seasonal Accumulation Percentiles",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
    },
}