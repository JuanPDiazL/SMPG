var layout = {
    general: {
        gridstack: {
            xResolution: 12,
            yResolution: 8,
            widgetWidth: 1/3,
            widgetHeight: 1/2,
            smpgDefaultOpts: {
                smpgCardType: "Disabled",
                id: () => crypto.randomUUID(),
                width: 1,
                height: 1,
            },
        },
    },
    gridstackWidgets: {
        map: {
            smpgOpts: {
                smpgCardType: "Map",
            },
            gridstackOpts: {
                id: "mapWidget",
                width: 1,
                height: 2,
            },
        },
        accumulations: {
            smpgOpts: {
                smpgCardType: "Seasonal Accumulations",
            },
            gridstackOpts: {
                id: "accumulationsWidget",
                width: 1,
                height: 1,
            },
        },
        current: {
            smpgOpts: {
                smpgCardType: "Current Year Status",
            },
            gridstackOpts: {
                id: "currentYearWidget",
                width: 1,
                height: 1,
            },
        },
        ensemble: {
            smpgOpts: {
                smpgCardType: "Ensemble",
            },
            gridstackOpts: {
                id: "ensembleWidget",
                width: 1,
                height: 1,
            },
        },
        seasonalPercentiles: {
            smpgOpts: {
                smpgCardType: "Seasonal Accumulation Percentiles",
            },
            gridstackOpts: {
                id: "seasonalPercentilesWidget",
                width: 1,
                height: 1,
            },
        },
    },
    floatingWidgets: {

    }
}