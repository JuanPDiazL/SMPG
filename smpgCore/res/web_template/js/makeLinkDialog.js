// This file contains the Rich Text card's links: website links (TinyMCE's own dialog), report
// view links (place and modify_layout hash parameters) and section links (headings of the same
// card)

"use strict";

// Report view links are relative, so they work wherever the report is opened from
const REPORT_LINK_PREFIX = "./index.html#";

// Widget properties a report view link can set, per card element, in the shape of
// chartCard.getProperties(). Keep in step with the elements' setProperties(). A property is a
// yes/no choice, or a choice among the values returned by `values`.
const REPORT_LINK_ELEMENT_PROPERTIES = {
    map: {
        legend_stat: { label: "Map statistic", values: () => mapFields },
        label_field: { label: "Map labels", values: () => property_ids },
        show_legend: { label: "Map legend", yes: "Show", no: "Hide" },
    },
    mapDescription: {
        show_description: { label: "Map description", yes: "Show", no: "Hide" },
    },
    table: {
        tableShown: { label: "Data table", yes: "Show", no: "Hide" },
    },
    editor: {
        editMode: { label: "Text mode", yes: "Edit mode", no: "View mode" },
    },
};

// Elements with properties, per card type; any other type is a chart card, with a table
const REPORT_LINK_CARD_ELEMENTS = {
    "Map": ["map", "mapDescription"],
    "Rich Text": ["editor"],
    "Empty Widget": [],
};

/**
 * Returns the elements with link properties of a card type.
 * @param {string} cardType - The card type's name.
 * @returns {Array<string>} Element keys of REPORT_LINK_ELEMENT_PROPERTIES.
 */
function getReportLinkCardElements(cardType) {
    return REPORT_LINK_CARD_ELEMENTS[cardType] ?? ["table"];
}

/**
 * Tells a link's type from its address.
 * @param {string} href - The link's address, as written.
 * @returns {string} "report" (place and modify_layout hash parameters), "section" (a heading of
 *   the same card) or "website" (anything else).
 */
function getLinkType(href) {
    if (href.startsWith(REPORT_LINK_PREFIX)) { return "report"; }
    if (href.startsWith("#")) { return "section"; }
    return "website";
}

/**
 * Builds a report view link's address.
 * @param {string} place - The place id.
 * @param {Object} widgetPatches - modify_layout's object, keyed by widget id; left out if empty.
 * @returns {string} ./index.html#place=...&modify_layout=...
 */
function buildReportLinkHref(place, widgetPatches) {
    let hash = `place=${encodeURIComponent(place)}`;
    if (Object.keys(widgetPatches).length > 0) {
        hash += `&modify_layout=${encodeURIComponent(JSON.stringify(widgetPatches))}`;
    }
    return REPORT_LINK_PREFIX + hash;
}

/**
 * Follows a link of a Rich Text card: report view links change this page's hash (the same tab),
 * section links scroll the card to their heading, and website links open in a new tab.
 * @param {Object} editor - The TinyMCE editor.
 * @param {HTMLAnchorElement} anchor - The link.
 */
function followLink(editor, anchor) {
    const href = anchor.getAttribute("href") ?? "";
    const linkType = getLinkType(href);
    if (linkType === "report") {
        window.location.hash = href.slice(REPORT_LINK_PREFIX.length);
    } else if (linkType === "section") {
        const target = getSectionLinkTarget(editor, href);
        if (target) {
            editor.selection.scrollIntoView(target, true);
        }
    } else {
        window.open(anchor.href, "_blank", "noopener,noreferrer");
    }
}

/**
 * Returns the heading a section link points to.
 * @param {Object} editor - The TinyMCE editor.
 * @param {string} href - The link's address, #id.
 * @returns {Element|null} The element with that id, or null if there is none.
 */
function getSectionLinkTarget(editor, href) {
    const id = decodeURIComponent(href.slice(1));
    return id === "" ? null : editor.getBody().querySelector(`[id="${CSS.escape(id)}"]`);
}

/**
 * Inserts a link, or updates an existing one.
 * @param {Object} editor - The TinyMCE editor.
 * @param {HTMLAnchorElement|null} anchor - The link to update, or null to insert one.
 * @param {string} href - The link's address.
 * @param {string} text - The text to display.
 * @param {string} title - The link's title; empty for none.
 * @param {string} originalText - The text the dialog started with; when unchanged, a link keeps
 *   its text's formatting.
 */
function applyLinkDialog(editor, anchor, href, text, title, originalText) {
    editor.undoManager.transact(() => {
        if (anchor && anchor.isConnected) {
            editor.dom.setAttribs(anchor, { href, title: title === "" ? null : title });
            if (text !== originalText) {
                anchor.textContent = text;
            }
        } else if (!editor.selection.isCollapsed() && text === originalText) {
            // Wraps the selection, keeping its formatting
            editor.execCommand("mceInsertLink", false, { href, title: title === "" ? null : title });
        } else {
            editor.insertContent(editor.dom.createHTML("a",
                { href, ...(title === "" ? {} : { title }) }, editor.dom.encode(text || href)));
        }
    });
    editor.nodeChanged();
}

/**
 * Returns the link at the editor's selection.
 * @param {Object} editor - The TinyMCE editor.
 * @returns {HTMLAnchorElement|null}
 */
function getSelectedLink(editor) {
    return editor.dom.getParent(editor.selection.getNode(), "a[href]");
}

/**
 * Opens the dialog matching a link's type: TinyMCE's own for website links.
 * @param {Object} editor - The TinyMCE editor.
 * @param {string} placeId - The card's current place.
 * @param {HTMLAnchorElement} anchor - The link to edit.
 */
function openLinkDialogFor(editor, placeId, anchor) {
    const linkType = getLinkType(anchor.getAttribute("href") ?? "");
    if (linkType === "report") {
        openReportLinkDialog(editor, placeId, anchor);
    } else if (linkType === "section") {
        openSectionLinkDialog(editor, anchor);
    } else {
        editor.execCommand("mceLink");
    }
}

/**
 * Returns the text and title fields' starting values: the link's, or the selected text.
 * @param {Object} editor - The TinyMCE editor.
 * @param {HTMLAnchorElement|null} anchor - The link being edited, or null.
 * @returns {Object} {text, title}
 */
function getLinkDialogTextData(editor, anchor) {
    if (anchor) {
        return { text: anchor.textContent, title: anchor.getAttribute("title") ?? "" };
    }
    return { text: editor.selection.getContent({ format: "text" }), title: "" };
}

/**
 * Opens the dialog to insert a report view link (a place, and changes to widgets through
 * modify_layout), or to edit one.
 * @param {Object} editor - The TinyMCE editor.
 * @param {string} placeId - The card's current place, the default for new links.
 * @param {HTMLAnchorElement|null} anchor - The link to edit, or null to insert one.
 */
function openReportLinkDialog(editor, placeId, anchor = null) {
    const placeIds = datasetProperties["place_ids"].map(String);
    // Every card has the report's card types; this card exists, so there is one
    const cardTypes = Object.keys(Object.values(cards)[0].cardTypes);

    // Widgets: the loaded ones, and the unloaded ones in the layout
    const widgets = {};
    for (const [widgetId, entry] of Object.entries(layout.gridstackWidgets)) {
        if (entry.unloaded) {
            widgets[widgetId] = `${entry.smpgOpts.smpgCardType} (${widgetId}, unloaded)`;
        }
    }
    for (const [widgetId, card] of Object.entries(cards)) {
        widgets[widgetId] = `${card.cardType} (${widgetId})`;
    }
    const getWidgetCardType = (widgetId) => cards[widgetId] ? cards[widgetId].cardType
        : layout.gridstackWidgets[widgetId] ? layout.gridstackWidgets[widgetId].smpgOpts.smpgCardType : null;

    // A row per widget change: {widget, state ("", "load", "unload"), type, props, extra}, where
    // props holds the dialog's values ("" for no change) keyed by "element.property", and extra
    // the patch's parts the dialog doesn't know, kept as they are
    const emptyRow = () => ({ widget: "", state: "", type: "", props: {}, extra: {} });
    let rows = [];
    let place = placeId;
    let notes = [];
    const { text: originalText, title } = getLinkDialogTextData(editor, anchor);

    if (anchor) {
        const params = new URLSearchParams(anchor.getAttribute("href").slice(REPORT_LINK_PREFIX.length));
        place = params.get("place") ?? placeId;
        const ignoredParams = [...params.keys()].filter((key) => key !== "place" && key !== "modify_layout");
        if (ignoredParams.length > 0) {
            notes.push(`The parameters ${ignoredParams.join(", ")} aren't supported and will be removed.`);
        }
        let widgetPatches = {};
        try {
            widgetPatches = JSON.parse(params.get("modify_layout") ?? "{}");
        } catch (error) {
            notes.push("The widget changes couldn't be read, and were reset.");
        }
        if (widgetPatches === null || typeof widgetPatches !== "object" || Array.isArray(widgetPatches)) {
            widgetPatches = {};
        }
        for (const [widgetId, patch] of Object.entries(widgetPatches)) {
            const row = emptyRow();
            row.widget = widgetId;
            if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
                rows.push(row);
                continue;
            }
            const { unloaded, smpgCardType, ...elements } = patch;
            row.state = unloaded === true ? "unload" : unloaded === false ? "load" : "";
            row.type = smpgCardType ?? "";
            for (const [element, properties] of Object.entries(elements)) {
                const schema = REPORT_LINK_ELEMENT_PROPERTIES[element];
                if (!schema || properties === null || typeof properties !== "object") {
                    row.extra[element] = properties;
                    continue;
                }
                for (const [property, value] of Object.entries(properties)) {
                    const field = schema[property];
                    if (field && (field.values ? field.values().includes(value) : typeof value === "boolean")) {
                        row.props[`${element}.${property}`] = String(value);
                    } else {
                        _.set(row.extra, [element, property], value);
                    }
                }
            }
            if (Object.keys(row.extra).length > 0) {
                notes.push(`Some changes to ${widgetId} can't be shown here, and are kept as they are.`);
            }
            rows.push(row);
        }
    }

    // Keeps values that aren't among the options (from an edited link) selectable
    const withValue = (items, value, suffix) => (value === "" || items.some((item) => item.value === value))
        ? items : [...items, { text: `${value} (${suffix})`, value }];

    // The rows' fields are named row<i>_<field>
    const readData = (data) => {
        place = data.place;
        rows = rows.map((row, index) => {
            const updated = { ...row, props: { ...row.props } };
            for (const field of ["widget", "state", "type"]) {
                if (data[`row${index}_${field}`] !== undefined) { updated[field] = data[`row${index}_${field}`]; }
            }
            for (const key in data) {
                const match = new RegExp(`^row${index}_prop_(.+)$`).exec(key);
                if (match) { updated.props[match[1]] = data[key]; }
            }
            return updated;
        });
        return data;
    };

    const buildPatches = () => {
        const widgetPatches = {};
        for (const row of rows) {
            if (row.widget === "") { continue; }
            const patch = _.cloneDeep(row.extra);
            if (row.state !== "") { patch.unloaded = row.state === "unload"; }
            if (row.type !== "") { patch.smpgCardType = row.type; }
            for (const element of getReportLinkCardElements(row.type || getWidgetCardType(row.widget))) {
                for (const [property, field] of Object.entries(REPORT_LINK_ELEMENT_PROPERTIES[element] ?? {})) {
                    const value = row.props[`${element}.${property}`] ?? "";
                    if (value === "") { continue; }
                    _.set(patch, [element, property], field.values ? value : value === "true");
                }
            }
            if (Object.keys(patch).length > 0) {
                widgetPatches[row.widget] = _.merge(widgetPatches[row.widget] ?? {}, patch);
            }
        }
        return widgetPatches;
    };

    const makeRowItems = (row, index) => {
        const propertyItems = [];
        for (const element of getReportLinkCardElements(row.type || getWidgetCardType(row.widget))) {
            for (const [property, field] of Object.entries(REPORT_LINK_ELEMENT_PROPERTIES[element] ?? {})) {
                const value = row.props[`${element}.${property}`] ?? "";
                const options = field.values
                    ? field.values().map((option) => ({ text: String(option), value: String(option) }))
                    : [{ text: field.yes, value: "true" }, { text: field.no, value: "false" }];
                propertyItems.push({ type: "listbox", name: `row${index}_prop_${element}.${property}`,
                    label: field.label, items: [{ text: "No change", value: "" }, ...options] });
            }
        }
        return {
            type: "label",
            label: `Widget change ${index + 1}`,
            items: [{
                type: "grid",
                columns: 2,
                items: [
                    { type: "listbox", name: `row${index}_widget`, label: "Widget",
                        items: withValue([{ text: "Select a widget", value: "" },
                            ...Object.entries(widgets).map(([widgetId, label]) => ({ text: label, value: widgetId }))],
                            row.widget, "not in this report") },
                    { type: "listbox", name: `row${index}_state`, label: "Load state",
                        items: [{ text: "No change", value: "" }, { text: "Load", value: "load" }, { text: "Unload", value: "unload" }] },
                    { type: "listbox", name: `row${index}_type`, label: "Card type",
                        items: withValue([{ text: "No change", value: "" },
                            ...cardTypes.map((cardType) => ({ text: cardType, value: cardType }))],
                            row.type, "unavailable") },
                    ...propertyItems,
                    { type: "button", name: `row${index}_remove`, text: "Remove", buttonType: "secondary" },
                ],
            }],
        };
    };

    const makeData = (base) => {
        const data = { ...base, place };
        rows.forEach((row, index) => {
            data[`row${index}_widget`] = row.widget;
            data[`row${index}_state`] = row.state;
            data[`row${index}_type`] = row.type;
            for (const [key, value] of Object.entries(row.props)) {
                data[`row${index}_prop_${key}`] = value;
            }
        });
        data.href = buildReportLinkHref(place, buildPatches());
        return data;
    };

    const makeSpec = (base) => {
        const data = makeData(base);
        return {
            title: anchor ? "Edit report view link" : "Insert report view link",
            size: "medium",
            body: {
                type: "panel",
                items: [
                    ...notes.map((note) => ({ type: "htmlpanel", html: `<p>${escapeHtml(note)}</p>` })),
                    { type: "input", name: "text", label: "Text to display" },
                    { type: "input", name: "title", label: "Title" },
                    { type: "listbox", name: "place", label: "Place",
                        items: withValue(placeIds.map((id) => ({ text: id, value: id })), place, "no data") },
                    ...rows.map(makeRowItems),
                    { type: "button", name: "add_row", text: "Add widget change", buttonType: "secondary" },
                    { type: "input", name: "href", label: "Link", enabled: false },
                ],
            },
            initialData: data,
            buttons: [
                { type: "cancel", text: "Cancel" },
                { type: "submit", text: anchor ? "Save" : "Insert", primary: true },
            ],
            // Fields depend on each row's widget and card type, so the dialog is rebuilt on changes
            onChange: (api, details) => {
                const changed = readData(api.getData());
                api.redial(makeSpec(changed));
                api.focus(details.name);
            },
            onAction: (api, details) => {
                const changed = readData(api.getData());
                if (details.name === "add_row") {
                    rows.push(emptyRow());
                } else {
                    const match = /^row(\d+)_remove$/.exec(details.name);
                    if (match) { rows.splice(Number(match[1]), 1); }
                }
                // The rows' fields are rebuilt from rows, so the old ones are dropped
                const kept = Object.fromEntries(Object.entries(changed).filter(([key]) => !key.startsWith("row")));
                api.redial(makeSpec(kept));
            },
            onSubmit: (api) => {
                const data = readData(api.getData());
                api.close();
                const href = buildReportLinkHref(place, buildPatches());
                applyLinkDialog(editor, anchor, href, data.text || `Place ${place}`, data.title, originalText);
            },
        };
    };

    editor.windowManager.open(makeSpec({ text: originalText, title }));
}

/**
 * Opens the dialog to insert a section link (to a heading of the same card), or to edit one.
 * The heading gets an id if it has none.
 * @param {Object} editor - The TinyMCE editor.
 * @param {HTMLAnchorElement|null} anchor - The link to edit, or null to insert one.
 */
function openSectionLinkDialog(editor, anchor = null) {
    const headings = [...editor.getBody().querySelectorAll("h1, h2, h3, h4, h5, h6")];
    const { text: originalText, title } = getLinkDialogTextData(editor, anchor);
    let heading = "";
    let note = null;
    if (anchor) {
        const target = getSectionLinkTarget(editor, anchor.getAttribute("href"));
        const index = headings.indexOf(target);
        if (index === -1) {
            note = "The section this link points to doesn't exist anymore. Select another one.";
        } else {
            heading = String(index);
        }
    }
    if (headings.length === 0) {
        note = "There are no headings in this card. Format a line as a heading (Font > Blocks) first.";
    }

    editor.windowManager.open({
        title: anchor ? "Edit section link" : "Insert section link",
        body: {
            type: "panel",
            items: [
                ...(note ? [{ type: "htmlpanel", html: `<p>${escapeHtml(note)}</p>` }] : []),
                { type: "input", name: "text", label: "Text to display" },
                { type: "input", name: "title", label: "Title" },
                { type: "listbox", name: "heading", label: "Section",
                    items: [{ text: "Select a section", value: "" }, ...headings.map((element, index) => ({
                        // Indented by heading level
                        text: `${" ".repeat(Number(element.tagName[1]) - 1)}${element.textContent.trim() || "(empty heading)"}`,
                        value: String(index),
                    }))] },
            ],
        },
        initialData: { text: originalText, title, heading },
        buttons: [
            { type: "cancel", text: "Cancel" },
            { type: "submit", text: anchor ? "Save" : "Insert", primary: true },
        ],
        onSubmit: (api) => {
            const data = api.getData();
            const target = headings[Number(data.heading)];
            if (data.heading === "" || !target) {
                editor.windowManager.alert("Select a section.");
                return;
            }
            api.close();
            editor.undoManager.transact(() => {
                if (!target.id) {
                    // A unique id from the heading's text
                    const base = `section-${_.kebabCase(target.textContent) || "heading"}`;
                    let id = base;
                    for (let n = 2; editor.getBody().querySelector(`[id="${CSS.escape(id)}"]`); n++) {
                        id = `${base}-${n}`;
                    }
                    editor.dom.setAttrib(target, "id", id);
                }
                applyLinkDialog(editor, anchor, `#${target.id}`,
                    data.text || target.textContent.trim(), data.title, originalText);
            });
        },
    });
}

/**
 * Adds the link buttons to a Rich Text editor, and makes its link clicks follow followLink().
 * Called from the editor's setup.
 * @param {Object} editor - The TinyMCE editor.
 * @param {Function} getPlaceId - Returns the card's current place.
 */
function setupEditorLinks(editor, getPlaceId) {
    // Replaces TinyMCE's link button; its dialog stays for website links
    editor.ui.registry.addMenuButton("linkmenu", {
        icon: "link",
        tooltip: "Link",
        fetch: (callback) => callback([
            { type: "menuitem", text: "Website link...", icon: "link",
                onAction: () => editor.execCommand("mceLink") },
            { type: "menuitem", text: "Report view link...", icon: "browse",
                onAction: () => openReportLinkDialog(editor, getPlaceId()) },
            { type: "menuitem", text: "Section link...", icon: "bookmark",
                onAction: () => openSectionLinkDialog(editor) },
        ]),
    });
    editor.ui.registry.addButton("linkedit", {
        icon: "edit-block",
        tooltip: "Edit link",
        onAction: () => {
            const anchor = getSelectedLink(editor);
            if (anchor) { openLinkDialogFor(editor, getPlaceId(), anchor); }
        },
    });
    editor.ui.registry.addButton("linkopen", {
        icon: "new-tab",
        tooltip: "Open link",
        onAction: () => {
            const anchor = getSelectedLink(editor);
            if (anchor) { followLink(editor, anchor); }
        },
    });
    // Small toolbar on a clicked link
    editor.ui.registry.addContextToolbar("linktoolbar", {
        predicate: (node) => editor.dom.getParent(node, "a[href]") !== null,
        items: "linkedit linkopen unlink",
        position: "node",
        scope: "node",
    });
    // Link clicks in view mode, and Ctrl/Cmd+clicks in edit mode. Caught before TinyMCE's own
    // handlers, which open every link but section links in a new tab.
    editor.on("init", () => {
        editor.getWin().addEventListener("click", (event) => {
            const anchor = event.target.closest ? event.target.closest("a[href]") : null;
            if (!anchor || event.button !== 0) { return; }
            if (!editor.mode.isReadOnly() && !(event.ctrlKey || event.metaKey)) { return; }
            event.preventDefault();
            event.stopPropagation();
            followLink(editor, anchor);
        }, true);
    });
}
