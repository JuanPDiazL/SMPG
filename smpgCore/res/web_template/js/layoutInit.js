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
 * Converts a widget's layout gridstackOpts (in widget units) into a gridstack item (in grid cells).
 * @param {string} widgetId - The widget's id.
 * @param {Object} gridstackOpts - The widget's {width, height, xPos, yPos}, see data/layout.js.
 * @returns {Object} The gridstack item {id, w, h, x, y}.
 */
function layoutOptsToGridstackItem(widgetId, gridstackOpts) {
    return {
        id: widgetId,
        w: gridstackOpts.width * GS_H_CELL_SIZE,
        h: gridstackOpts.height * GS_V_CELL_SIZE,
        x: gridstackOpts.xPos * GS_H_CELL_SIZE,
        y: gridstackOpts.yPos * GS_V_CELL_SIZE,
    };
}

/**
 * Converts a gridstack item, as returned by grid.save(), into layout gridstackOpts (the inverse
 * of layoutOptsToGridstackItem()).
 * @param {Object} savedItem - The gridstack item {x, y, w, h}.
 * @returns {Object} The widget's {width, height, xPos, yPos}, in widget units.
 */
function gridstackItemToLayoutOpts(savedItem) {
    return {
        // grid.save() omits w/h when they equal 1 cell
        width: (savedItem.w ?? 1) / GS_H_CELL_SIZE,
        height: (savedItem.h ?? 1) / GS_V_CELL_SIZE,
        xPos: savedItem.x / GS_H_CELL_SIZE,
        yPos: savedItem.y / GS_V_CELL_SIZE,
    };
}

/**
 * Parses the layout gridstack items from the layout object and returns an array of gridstack items.
 * Unloaded widgets are left out.
 * @param {Object} layout - Object containing the layout gridstack items.
 */
function parseGridstackItems(layout) {
    let parsedItems = [];
    for (const gridItemId in layout.gridstackWidgets) {
        let gridItem = layout.gridstackWidgets[gridItemId];
        if (gridItem.unloaded) { continue; }
        parsedItems.push(layoutOptsToGridstackItem(gridItemId, gridItem.gridstackOpts));
    }
    return parsedItems;
}

/**
 * Parses the layout smpg widgets from the layout object and returns an array of gridstack items.
 * Unloaded widgets are left out.
 * @param {Object} layout - Object containing the layout smpg widgets.
 */
function parseWidgets(layout) {
    let parsedWidgets = {};
    for (const gridItemId in layout.gridstackWidgets) {
        let gridItem = layout.gridstackWidgets[gridItemId];
        if (gridItem.unloaded) { continue; }
        parsedWidgets[gridItemId] = new chartCard(
            `[gs-id="${gridItemId}"] .grid-stack-item-content`,
            gridItem.smpgOpts
        );
    }
    reportInvalidCardTypes(parsedWidgets);
    return parsedWidgets;
}

/**
 * Reports the cards whose last setProperties() asked for a card type this report doesn't offer
 * (they were made empty widgets): one console error each, and one warning listing them all.
 * @param {Object} widgetCards - Object of widget id to its chartCard.
 */
function reportInvalidCardTypes(widgetCards) {
    const invalidIds = Object.keys(widgetCards)
        .filter((widgetId) => widgetCards[widgetId].invalidCardType !== null);
    if (invalidIds.length === 0) { return; }
    for (const widgetId of invalidIds) {
        console.error(`Widget "${widgetId}": the card type "${widgetCards[widgetId].invalidCardType}" isn't available in this report; it was replaced with an empty widget.`);
    }
    // card types can come from the URL, so they're escaped
    const widgetList = invalidIds
        .map((widgetId) => `${widgetId} ("${escapeHtml(widgetCards[widgetId].invalidCardType)}")`)
        .join("<br>");
    showModal(`These widgets couldn't be loaded because their card type isn't available in this report, and were replaced with empty widgets:<br>${widgetList}`);
}

/**
 * Returns the highest widget number (wN) among all the layout's widgets, unloaded ones included,
 * so new widgets never reuse an existing id.
 * @param {Object} layout - Object containing the layout's widgets.
 * @returns {number} The highest N, or 0 if there is none.
 */
function getHighestWidgetNumber(layout) {
    return Math.max(0, ...Object.keys(layout.gridstackWidgets)
        .map((widgetId) => /^w(\d+)$/.exec(widgetId))
        .filter((match) => match !== null)
        .map((match) => Number(match[1])));
}

/**
 * Removes a loaded widget from the report: destroys its card's elements, removes it from the
 * grid, and forgets its card.
 * @param {string} widgetId - The id of a loaded widget.
 */
function removeLoadedWidget(widgetId) {
    cards[widgetId].destroy();
    grid.removeWidget(grid.getGridItems().find((element) => element.gridstackNode.id === widgetId));
    delete cards[widgetId];
}

/**
 * Closes a loaded widget for good: it's removed from the report and from the layout object.
 * @param {string} widgetId - The id of a loaded widget.
 */
function closeWidget(widgetId) {
    removeLoadedWidget(widgetId);
    delete layout.gridstackWidgets[widgetId];
}

/**
 * Unloads a loaded widget: its card's properties and its size and position are saved in the
 * layout object with `unloaded: true`, then it's removed from the report. loadWidget() brings
 * it back.
 * @param {string} widgetId - The id of a loaded widget.
 */
function unloadWidget(widgetId) {
    // grid.save() gives the full-width layout's positions even when the grid shows fewer columns
    const savedItem = grid.save(false, false).find((item) => item.id === widgetId);
    layout.gridstackWidgets[widgetId] = {
        unloaded: true,
        smpgOpts: cards[widgetId].getProperties(),
        gridstackOpts: gridstackItemToLayoutOpts(savedItem),
    };
    removeLoadedWidget(widgetId);
}

/**
 * Loads an unloaded widget back into the report, from its saved properties, size and position.
 * @param {string} widgetId - The id of an unloaded widget.
 */
function loadWidget(widgetId) {
    const entry = layout.gridstackWidgets[widgetId];
    grid.addWidget(layoutOptsToGridstackItem(widgetId, entry.gridstackOpts));
    cards[widgetId] = new chartCard(`[gs-id="${widgetId}"] .grid-stack-item-content`, entry.smpgOpts);
    delete entry.unloaded;
    reportInvalidCardTypes({ [widgetId]: cards[widgetId] });
}

/**
 * Applies a patch of widget property overrides, in the same shape returned by
 * chartCard.getProperties() for each widget (e.g. from the "modify_layout" URL hash parameter).
 * A patch may also have `unloaded`: true unloads a loaded widget (after applying the rest of the
 * patch), false loads an unloaded one back (before). The rest of a patch for a widget that stays
 * unloaded is merged into its saved properties. Unknown widget ids and patches that aren't
 * objects are ignored. A card type this report doesn't offer makes the card empty, and is reported.
 * @param {Object} widgetPatches - Object keyed by widget id.
 */
function applyLayoutModifications(widgetPatches) {
    const isOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    let patchedCards = {};
    for (const widgetId in widgetPatches) {
        const patch = widgetPatches[widgetId];
        if (patch === null || typeof patch !== "object" || Array.isArray(patch)) { continue; }
        const { unloaded, ...properties } = patch;
        const entry = isOwn(layout.gridstackWidgets, widgetId) ? layout.gridstackWidgets[widgetId] : null;

        if (unloaded === false && entry && entry.unloaded) {
            loadWidget(widgetId);
        }
        if (isOwn(cards, widgetId)) {
            cards[widgetId].setProperties(properties);
            patchedCards[widgetId] = cards[widgetId];
            if (unloaded === true) {
                unloadWidget(widgetId);
            }
        } else if (entry && entry.unloaded) {
            _.merge(entry.smpgOpts, properties);
        }
    }
    reportInvalidCardTypes(patchedCards);
}
