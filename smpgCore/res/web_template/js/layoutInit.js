const GS_H_RES = layout.general.gridstack.xResolution;
const GS_V_RES = layout.general.gridstack.yResolution;
const GS_H_CELL_SIZE = Math.round(layout.general.gridstack.xResolution * layout.general.gridstack.widgetWidth);
const GS_V_CELL_SIZE = Math.round(layout.general.gridstack.yResolution * layout.general.gridstack.widgetHeight);

var gridstackBaseLayerOptions = {
    animate: false,
    float: true,
    // row: 6,
    column: GS_H_RES,
    // handle: ".card-header",
    resizable: { handles: 'all'},
    staticGrid: true,
    columnOpts: {
        breakpointForWindow: false,
        layout: 'list',
        columnMax: GS_H_RES,
        breakpoints: [
            {w:800,  c:GS_H_CELL_SIZE*1},
            {w:1100, c:GS_H_CELL_SIZE*2},
            {w:1280, c:GS_H_CELL_SIZE*3},
        ]
    },
};

/**
 * Parses the layout gridstack items from the layout object and returns an array of gridstack items.
 * @param {Object} layout - Object containing the layout gridstack items.
 */
function parseGridstackItems(layout) {
    let parsedItems = [];
    for (const gridItemId in layout.gridstackWidgets) {
        let gridItem = layout.gridstackWidgets[gridItemId];
        parsedItems.push({
            id: gridItemId,
            w: gridItem.gridstackOpts.width * GS_H_CELL_SIZE,
            h: gridItem.gridstackOpts.height * GS_V_CELL_SIZE,
        });
    }
    return parsedItems;
}

/**
 * Parses the layout smpg widgets from the layout object and returns an array of gridstack items.
 * @param {Object} layout - Object containing the layout smpg widgets.
 */
function parseWidgets(layout) {
    let parsedWidgets = {};
    for (const gridItemId in layout.gridstackWidgets) {
        let gridItem = layout.gridstackWidgets[gridItemId];
        parsedWidgets[gridItemId] = new chartCard(
            `[gs-id="${gridItemId}"] .grid-stack-item-content`,
            gridItem.smpgOpts.smpgCardType
        );
    }
    return parsedWidgets;
}
