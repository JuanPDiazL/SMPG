// Each widget's smpgOpts is passed to `new chartCard()` and applied via chartCard.setProperties(),
// so besides the required smpgCardType it accepts the same shape as chartCard.getProperties()/
// setProperties() and the "modify_layout" URL hash parameter (e.g. smpgOpts: {smpgCardType: "Map",
// map: {legend_stat: "Average Total", show_legend: true}, mapDescription: {show_description: true}}).
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
        w1: {
            smpgOpts: {
                smpgCardType: "Map",
            },
            gridstackOpts: {
                width: 1,
                height: 2,
            },
        },
        w2: {
            smpgOpts: {
                smpgCardType: "Seasonal Accumulations",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
        w3: {
            smpgOpts: {
                smpgCardType: "Current Year Status",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
        w4: {
            smpgOpts: {
                smpgCardType: "Ensemble",
            },
            gridstackOpts: {
                width: 1,
                height: 1,
            },
        },
        w5: {
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