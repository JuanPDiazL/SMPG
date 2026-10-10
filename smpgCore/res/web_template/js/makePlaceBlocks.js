// This file contains the Rich Text card's place text blocks: parts of the text that view mode only
// shows while their place is selected. Edit mode always shows them, highlighted.

"use strict";

// A block is <div class="place-block" data-place="40782">...</div>, holding any text
const PLACE_BLOCK_CLASS = "place-block";
const PLACE_BLOCK_SELECTOR = `div.${PLACE_BLOCK_CLASS}`;

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
        if (block.getAttribute("data-place") !== String(placeId)) {
            block.remove();
        }
    }
    return body.innerHTML;
}

/**
 * Returns the editor styles for place text blocks: in edit mode, a tinted block with a "Dedicated place text block for [place name]"
 * label, red when this report has no such place. View mode shows them as plain text.
 * @returns {string} CSS for the editor's content_style.
 */
function getPlaceBlockContentStyle() {
    const block = `body:not(.mce-content-readonly) ${PLACE_BLOCK_SELECTOR}`;
    const knownPlaces = datasetProperties["place_ids"]
        .map((id) => `[data-place="${String(id).replace(/[\\"]/g, "\\$&")}"]`)
        .join(",");
    return ` ${block} { position: relative; margin: 0.5em 0; padding: 1.3em 0.6em 0.1em;`
        + " background-color: rgba(0, 137, 123, 0.07); border-left: 3px solid rgba(0, 137, 123, 0.7); }"
        // The label is drawn by CSS, so it's never part of the text
        + ` ${block}::before { content: "Dedicated place text block for " attr(data-place); position: absolute; top: 0.25em;`
        + " left: 0.6em; font-size: 0.75em; font-weight: bold; color: #00796b; }"
        + ` ${block}:not(${knownPlaces}) { background-color: rgba(211, 47, 47, 0.08);`
        + " border-left-color: #d32f2f; }"
        + ` ${block}:not(${knownPlaces})::before { content: "Place " attr(data-place) " (no data)";`
        + " color: #d32f2f; }";
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
 * paragraph), or to change a block's place.
 * @param {Object} editor - The TinyMCE editor.
 * @param {HTMLElement|null} block - The block to change, or null to insert one.
 */
function openPlaceBlockDialog(editor, block = null) {
    const placeIds = datasetProperties["place_ids"].map(String);
    const place = block ? (block.getAttribute("data-place") ?? "") : String(currentDataIndex);
    const items = placeIds.map((id) => ({ text: id, value: id }));
    if (!placeIds.includes(place)) {
        items.unshift({ text: `${place} (no data)`, value: place });
    }

    editor.windowManager.open({
        title: block ? "Change place text" : "Insert place text",
        body: {
            type: "panel",
            items: [
                { type: "htmlpanel", html: "<p>The text in this block is only shown in view mode while its"
                    + " place is selected.</p>" },
                { type: "listbox", name: "place", label: "Place", items },
            ],
        },
        initialData: { place },
        buttons: [
            { type: "cancel", text: "Cancel" },
            { type: "submit", text: block ? "Save" : "Insert", primary: true },
        ],
        onSubmit: (api) => {
            const selectedPlace = api.getData().place;
            api.close();
            editor.undoManager.transact(() => {
                if (block) {
                    editor.dom.setAttrib(block, "data-place", selectedPlace);
                } else {
                    editor.formatter.apply("placeblock", { place: selectedPlace });
                }
            });
            editor.nodeChanged();
        },
    });
}

/**
 * Adds place text blocks to a Rich Text editor: the insert button, the block format, and the
 * small toolbar on a clicked block. Called from the editor's setup.
 * @param {Object} editor - The TinyMCE editor.
 */
function setupPlaceBlocks(editor) {
    editor.on("PreInit", () => {
        // Wraps the selected paragraphs (lists and tables included) in a block, like blockquote
        editor.formatter.register("placeblock", {
            block: "div",
            wrapper: true,
            classes: PLACE_BLOCK_CLASS,
            attributes: { "data-place": "%place" },
            merge_siblings: false,
        });
    });
    // Inserts a block, or changes the place of the block at the selection, so blocks never nest
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
