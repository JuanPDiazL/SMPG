// This file contains the Rich Text card's place text blocks: parts of the text that view mode only
// shows while their place is selected. Edit mode always shows them, highlighted.

"use strict";

// A block is <div class="place-block" data-places='["40782","40783"]'>...</div>, holding any
// text. Place ids are free text, so the list is JSON. Older blocks have one place, in data-place.
const PLACE_BLOCK_CLASS = "place-block";
const PLACE_BLOCK_SELECTOR = `div.${PLACE_BLOCK_CLASS}`;

/**
 * Returns the places of a place text block.
 * @param {Element} block - The block.
 * @returns {Array<string>|null} The place ids, or null when data-places isn't a list of strings.
 */
function getBlockPlaces(block) {
    if (!block.hasAttribute("data-places")) {
        return block.hasAttribute("data-place") ? [block.getAttribute("data-place")] : [];
    }
    try {
        const places = JSON.parse(block.getAttribute("data-places"));
        return Array.isArray(places) && places.every((place) => typeof place === "string") ? places : null;
    } catch (error) {
        return null;
    }
}

/**
 * Returns the value of a block's data-places attribute.
 * @param {Array<string>} places - The place ids.
 * @returns {string}
 */
function formatBlockPlaces(places) {
    return JSON.stringify(places);
}

/**
 * Removes the place text blocks of other places from a document, for view mode.
 * @param {string} html - The document's HTML.
 * @param {string} placeId - The selected place.
 * @returns {string} The HTML without the other places' blocks.
 */
function filterPlaceBlocks(html, placeId) {
    if (!html.includes(PLACE_BLOCK_CLASS)) { return html; }
    // A DOMParser document is inert: nothing in it runs or loads
    const body = new DOMParser().parseFromString(html, "text/html").body;
    for (const block of body.querySelectorAll(PLACE_BLOCK_SELECTOR)) {
        if (!(getBlockPlaces(block) ?? []).includes(String(placeId))) {
            block.remove();
        }
    }
    return body.innerHTML;
}

/**
 * Returns the editor styles for place text blocks: in edit mode, a tinted block with a label
 * naming its places, red when one of them has no data in this report. View mode shows them as
 * plain text.
 * @returns {string} CSS for the editor's content_style.
 */
function getPlaceBlockContentStyle() {
    const block = `body:not(.mce-content-readonly) ${PLACE_BLOCK_SELECTOR}`;
    return ` ${block} { position: relative; margin: 0.5em 0; padding: 1.3em 0.6em 0.1em;`
        + " background-color: rgba(0, 137, 123, 0.07); border-left: 3px solid rgba(0, 137, 123, 0.7); }"
        // The label is drawn by CSS, from attributes that are never saved (see updatePlaceBlockLabels())
        + ` ${block}::before { content: attr(data-mce-label); position: absolute; top: 0.25em;`
        + " left: 0.6em; font-size: 0.75em; font-weight: bold; color: #00796b; }"
        + ` ${block}[data-mce-warning] { background-color: rgba(211, 47, 47, 0.08);`
        + " border-left-color: #d32f2f; }"
        + ` ${block}[data-mce-warning]::before { color: #d32f2f; }`;
}

/**
 * Sets the edit-mode labels of the editor's place text blocks, which name their places and the
 * ones with no data in this report. The label attributes are temporary: never saved.
 * @param {Object} editor - The TinyMCE editor.
 */
function updatePlaceBlockLabels(editor) {
    const knownPlaces = new Set(datasetProperties["place_ids"].map(String));
    for (const block of editor.getBody().querySelectorAll(PLACE_BLOCK_SELECTOR)) {
        const places = getBlockPlaces(block);
        let label;
        let warning = true;
        if (places === null) {
            label = "Dedicated place text block with an invalid place list";
        } else if (places.length === 0) {
            label = "Dedicated place text block without places";
        } else {
            const unknown = places.filter((place) => !knownPlaces.has(place));
            label = `Dedicated place text block for ${places.join(", ")}`
                + (unknown.length > 0 ? ` (no data: ${unknown.join(", ")})` : "");
            warning = unknown.length > 0;
        }
        if (block.getAttribute("data-mce-label") !== label) {
            block.setAttribute("data-mce-label", label);
        }
        if (block.hasAttribute("data-mce-warning") !== warning) {
            block.toggleAttribute("data-mce-warning", warning);
        }
    }
}

/**
 * Returns the place text block containing a node.
 * @param {Object} editor - The TinyMCE editor.
 * @param {Node} node - A node of the editor's document.
 * @returns {HTMLElement|null}
 */
function getPlaceBlock(editor, node) {
    return editor.dom.getParent(node, PLACE_BLOCK_SELECTOR);
}

/**
 * Opens the dialog to insert a place text block around the selected paragraphs (or the caret's
 * paragraph), or to change a block's places.
 * @param {Object} editor - The TinyMCE editor.
 * @param {HTMLElement|null} block - The block to change, or null to insert one.
 */
function openPlaceBlockDialog(editor, block = null) {
    const placeIds = datasetProperties["place_ids"].map(String);
    const selected = block ? (getBlockPlaces(block) ?? []) : [String(currentDataIndex)];
    // Places without data in this report come first, so they can be unticked
    const unknown = selected.filter((place) => !placeIds.includes(place));
    const choices = [...unknown.map((place) => ({ place, text: `${place} (no data)` })),
        ...placeIds.map((place) => ({ place, text: place }))];
    // Checkbox names are indexes, as place ids are free text
    const initialData = Object.fromEntries(choices.map((choice, index) =>
        [`place${index}`, selected.includes(choice.place)]));

    editor.windowManager.open({
        title: block ? "Change place text" : "Insert place text",
        body: {
            type: "panel",
            items: [
                { type: "htmlpanel", html: "<p>The text in this block is only shown in view mode while one"
                    + " of its places is selected.</p>" },
                { type: "grid", columns: 4, items: choices.map((choice, index) =>
                    ({ type: "checkbox", name: `place${index}`, label: choice.text })) },
            ],
        },
        initialData,
        buttons: [
            { type: "cancel", text: "Cancel" },
            { type: "submit", text: block ? "Save" : "Insert", primary: true },
        ],
        onSubmit: (api) => {
            const data = api.getData();
            const places = choices.filter((choice, index) => data[`place${index}`])
                .map((choice) => choice.place);
            if (places.length === 0) {
                editor.windowManager.alert("Select at least one place.");
                return;
            }
            api.close();
            editor.undoManager.transact(() => {
                if (block) {
                    // Older blocks move to data-places
                    editor.dom.setAttribs(block, { "data-places": formatBlockPlaces(places), "data-place": null });
                } else {
                    editor.formatter.apply("placeblock", { places: formatBlockPlaces(places) });
                }
            });
            updatePlaceBlockLabels(editor);
            editor.nodeChanged();
        },
    });
}

/**
 * Adds place text blocks to a Rich Text editor: the insert button, the block format, the
 * small toolbar on a clicked block, and the edit-mode labels. Called from the editor's setup.
 * @param {Object} editor - The TinyMCE editor.
 */
function setupPlaceBlocks(editor) {
    editor.on("PreInit", () => {
        // Wraps the selected paragraphs (lists and tables included) in a block, like blockquote
        editor.formatter.register("placeblock", {
            block: "div",
            wrapper: true,
            classes: PLACE_BLOCK_CLASS,
            // Filled in once, as is: the list's own % signs are kept
            attributes: { "data-places": "%places" },
            merge_siblings: false,
        });
        editor.serializer.addTempAttr("data-mce-label");
        editor.serializer.addTempAttr("data-mce-warning");
    });
    // Labels follow loaded, pasted, undone and redone content
    editor.on("SetContent Undo Redo", () => updatePlaceBlockLabels(editor));
    // Inserts a block, or changes the places of the block at the selection, so blocks never nest
    editor.ui.registry.addButton("placeblock", {
        icon: "visualblocks",
        tooltip: "Place text",
        onAction: () => openPlaceBlockDialog(editor, getPlaceBlock(editor, editor.selection.getNode())),
    });
    editor.ui.registry.addButton("placeblockremove", {
        icon: "remove",
        tooltip: "Remove place text block (keeps the text)",
        onAction: () => {
            const block = getPlaceBlock(editor, editor.selection.getNode());
            if (!block) { return; }
            editor.undoManager.transact(() => editor.dom.remove(block, true));
            editor.nodeChanged();
        },
    });
    // Small toolbar on a clicked block. Link and template variable toolbars, found on the
    // way up from the clicked node, take precedence.
    editor.ui.registry.addContextToolbar("placeblocktoolbar", {
        predicate: (node) => node.nodeName === "DIV" && node.classList.contains(PLACE_BLOCK_CLASS),
        items: "placeblock placeblockremove",
        position: "node",
        scope: "node",
    });
}
