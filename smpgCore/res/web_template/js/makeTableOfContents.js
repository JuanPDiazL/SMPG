// This file contains the Rich Text card's tables of contents: a placeholder in edit mode, replaced
// in view mode by a list of links to the card's headings.

"use strict";

// The text stores only this placeholder; view mode fills it with the list each time it renders.
// A nav, not a div: the editor treats its divs as place text blocks.
const TEXT_TOC_CLASS = "text-toc";
const TEXT_TOC_SELECTOR = `nav.${TEXT_TOC_CLASS}`;
const TEXT_TOC_PLACEHOLDER = `<nav class="${TEXT_TOC_CLASS}" contenteditable="false">Table of contents</nav>`;

/**
 * Fills the tables of contents of a document with a list of section links to its headings, for
 * view mode. A heading nests under the closest earlier heading of a higher level, one step at a
 * time, so skipped levels don't leave empty items. Headings without an id get one (in this copy
 * only), by the section link dialog's rule. Tables of contents without headings are removed.
 * @param {string} html - The document's HTML.
 * @returns {string} The HTML with the lists.
 */
function buildTablesOfContents(html) {
    if (!html.includes(TEXT_TOC_CLASS)) { return html; }
    // A DOMParser document is inert: nothing in it runs or loads
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tables = doc.body.querySelectorAll(TEXT_TOC_SELECTOR);
    if (tables.length === 0) { return html; }

    const list = doc.createElement("ul");
    const parents = []; // the open items: {level, item}, by increasing level
    for (const heading of doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
        // Plain text, template variables included (filled in afterwards)
        const text = heading.textContent.replace(/\s+/g, " ").trim();
        if (text === "") { continue; }
        if (!heading.id) {
            heading.id = getUniqueHeadingId(heading, doc.body);
        }
        const level = Number(heading.tagName[1]);
        while (parents.length > 0 && parents[parents.length - 1].level >= level) {
            parents.pop();
        }
        let parentList = list;
        if (parents.length > 0) {
            const parentItem = parents[parents.length - 1].item;
            parentList = parentItem.querySelector(":scope > ul");
            if (!parentList) {
                parentList = parentItem.appendChild(doc.createElement("ul"));
            }
        }
        const item = parentList.appendChild(doc.createElement("li"));
        const link = item.appendChild(doc.createElement("a"));
        link.setAttribute("href", `#${heading.id}`);
        link.textContent = text;
        parents.push({ level, item });
    }

    for (const table of tables) {
        if (list.childElementCount === 0) {
            table.remove();
        } else {
            table.replaceChildren(list.cloneNode(true));
        }
    }
    return doc.body.innerHTML;
}

/**
 * Returns the editor styles for tables of contents: in edit mode, a locked placeholder box with a
 * hint. View mode shows the list as a plain bulleted list.
 * The editor's content has no dark mode (light oxide skin), so neither does this.
 * @returns {string} CSS for the editor's content_style.
 */
function getTableOfContentsContentStyle() {
    const table = `body:not(.mce-content-readonly) ${TEXT_TOC_SELECTOR}`;
    return ` ${table} { display: block; margin: 0.5em 0; padding: 0.4em 0.6em; color: #616161;`
        + " border: 1px dashed #9e9e9e; border-radius: 3px; cursor: default; }"
        // The hint is drawn by CSS, so it's never part of the text
        + ` ${table}::after { content: " (lists the headings in view mode)"; font-size: 0.85em;`
        + " font-style: italic; }";
}

/**
 * Adds the table of contents button to a Rich Text editor. Called from the editor's setup.
 * @param {Object} editor - The TinyMCE editor.
 */
function setupTableOfContents(editor) {
    editor.ui.registry.addButton("tableofcontents", {
        icon: "toc",
        tooltip: "Table of contents",
        onAction: () => {
            // A selected table of contents would be replaced by the new one
            if (editor.dom.getParent(editor.selection.getNode(), TEXT_TOC_SELECTOR)) { return; }
            editor.insertContent(TEXT_TOC_PLACEHOLDER);
        },
    });
}
