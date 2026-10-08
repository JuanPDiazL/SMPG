// The report's widgets. Each entry in gridstackWidgets (w1, w2, ...) has:
// - gridstackOpts: its size and position (width, height, xPos, yPos), in units of
//   layout.general.gridstack.widgetWidth/widgetHeight, converted to grid cells on load.
// - smpgOpts: what the widget shows, in the shape of chartCard.getProperties(). smpgCardType is
//   required; any other key sets one element of the card. One property per example:
//     smpgCardType: "Map"                                 the card's type
//     map: { legend_stat: "Average Total" }               statistic shown on the map
//     map: { label_field: "ADM2_CODE" }                   field used for the polygons' labels
//     map: { show_legend: false }                         hides the map's legend
//     mapDescription: { show_description: true }         shows the description under the map
//     table: { tableShown: true }                         shows a chart card's data table
//     editor: { editMode: true }                          opens a Rich Text card in edit mode
//     editor: { text: "<p>Notes for {{place}}</p>" }      a Rich Text card's content
//
// The same smpgOpts properties can change the widgets of an open report through the URL hash
// parameter modify_layout: a JSON object keyed by widget id, URL-encoded with encodeURIComponent.
// Shown here unencoded, this switches w1's map to the "Average Total" statistic:
//     #place=40782&modify_layout={"w1":{"map":{"legend_stat":"Average Total"}}}
// A full example, setting every property modify_layout accepts:
//     #place=40782&modify_layout={"w1":{"smpgCardType":"Map","map":{"legend_stat":"Average Total","label_field":"ADM2_CODE","show_legend":false},"mapDescription":{"show_description":true}},"w2":{"smpgCardType":"Seasonal Accumulations","table":{"tableShown":true}},"w3":{"smpgCardType":"Rich Text","editor":{"editMode":true}}}
// It's applied once and then removed from the URL; the rest of the hash is kept. For security, a
// Rich Text card's text can't be set this way: it's ignored, with a console warning.
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