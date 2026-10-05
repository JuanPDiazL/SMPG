// This file contains the code to construct the rich text editor card

"use strict";

// Every path points to the files bundled with the report, so TinyMCE makes no network requests
const TEXT_EDITOR_TINYMCE_OPTIONS = {
    base_url: "./js/libraries/tinymce",
    suffix: ".min",
    skin: false, // skin.min.css is loaded by the page's stylesheet queue
    content_css: [
        "./css/libraryStyles/tinymce/skins/ui/oxide/content.min.css",
        "./css/libraryStyles/tinymce/skins/content/default/content.min.css",
    ],
    // Styles inside the editing iframe, which the page's stylesheets don't reach.
    // Read-only mode keeps the body editable and only adds .mce-content-readonly, so the caret still shows.
    // In edit mode, template variables are tinted, and the ones that don't resolve marked red.
    // In edit mode, the body also fills the editor (minus its 1rem margins), so clicks and the
    // context menu work in the blank space below the text.
    content_style: "body.mce-content-readonly { caret-color: transparent; }"
        + " html { height: 100%; }"
        + " body:not(.mce-content-readonly) { min-height: calc(100% - 2rem); }"
        + " body:not(.mce-content-readonly) .template-token {"
        + " background-color: rgba(0, 108, 231, 0.1); border-radius: 3px; padding: 0 2px; }"
        + " body:not(.mce-content-readonly) .template-token-invalid {"
        + " background-color: rgba(211, 47, 47, 0.12); text-decoration: underline wavy #d32f2f; }",
    // Template variables (matched by noneditable_regexp at init) become locked pieces with this class
    noneditable_class: "template-token",
    // Elements that aren't text formatting are removed, from any source (typing, pasting,
    // the code view, layout.js).
    invalid_elements: "script,noscript,style,link,meta,base,template,"
        + "form,input,button,select,option,optgroup,textarea,label,fieldset,"
        + "legend,datalist,output,iframe,frame,frameset,object,embed,applet,"
        + "param,video,audio,source,track,canvas,svg,math,dialog",
    license_key: "gpl",
    plugins: "lists link table code quickbars",
    toolbar: "fontformat alignment spacing insert | code",
    // Group buttons, each opening a small floating toolbar with its buttons
    toolbar_groups: {
        fontformat: {
            icon: "format",
            tooltip: "Font",
            items: "blocks fontfamily fontsize | forecolor backcolor | bold italic underline strikethrough"
                + " | superscript subscript | removeformat",
        },
        alignment: {
            icon: "align-left",
            tooltip: "Alignment",
            items: "alignleft aligncenter alignright alignjustify",
        },
        // Lists live with indent/outdent, which also nest and un-nest list items
        spacing: {
            icon: "line-height",
            tooltip: "Lists and spacing",
            items: "bullist numlist | outdent indent lineheight",
        },
        insert: {
            icon: "plus",
            tooltip: "Insert",
            items: "templatevariable link table hr",
        },
    },
    // Floating toolbar on selected text; the insert toolbar (whose image button inserts
    // temporary blob: URLs) and the image toolbar are disabled
    quickbars_selection_toolbar: "bold italic",
    quickbars_insert_toolbar: false,
    quickbars_image_toolbar: false,
    menubar: false,
    ui_mode: "split", // keeps menus and popups inside the card instead of on <body>
    promotion: false,
    branding: false,
    statusbar: false,
    resize: false,
    height: "100%",
};

// Template variables: {{ expression }}, where the expression is a property lookup or a call to a
// function from TEMPLATE_FUNCTIONS, and is never evaluated as code
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*(.+?)\s*\}\}/g;
const TEMPLATE_PATH_START_PATTERN = /^\s*([A-Za-z_$][\w$]*)/;
// ["key"] | ['key'] | [0] | [variable], where [variable] uses a context variable's value as
// the key, e.g. [place]; literal keys must be quoted
const TEMPLATE_PATH_SEGMENT_PATTERN =
    /^\s*\[\s*(?:"([^"]*)"|'([^']*)'|(\d+)|([A-Za-z_$][\w$]*))\s*\]/;
const TEMPLATE_NUMBER_PATTERN = /^\s*(-?\d+(?:\.\d+)?)/;
const TEMPLATE_STRING_PATTERN = /^\s*(?:"([^"]*)"|'([^']*)')/;
const TEMPLATE_PUNCTUATION_PATTERN = /^\s*([(),])/;
// Shorthand call: {{ name: some text }} is name(place, "some text"), with the text taken literally
const TEMPLATE_SHORTHAND_PATTERN = /^\s*([A-Za-z_$][\w$]*)\s*:([^]*)$/;
// Decodes HTML entities without running markup: a textarea's content is never parsed as HTML
const templateTokenDecoder = document.createElement("textarea");

// The only functions template variables can call. They must only read data and change nothing
// (no DOM, no network). A function that throws or returns nothing leaves its token as typed.
// Functions applied to a variable declare, for the insert dialog, the `dataType` of the value
// they take as first argument, a `description`, and their further `parameters`
// ({label, type, default}). (Not `arguments`: setting that on a function throws in strict mode.)
const TEMPLATE_FUNCTIONS = {
    // Exactly `decimals` decimals, e.g. fixed(83.7, 2) gives "83.70"
    fixed: Object.assign((value, decimals = 0) => value.toFixed(decimals), {
        dataType: "number",
        description: "exactly the decimals",
        parameters: [{ label: "Decimals", type: "number", default: "1" }],
    }),
    // At most `decimals` decimals, e.g. round(83.7, 2) gives 83.7
    round: Object.assign((value, decimals = 0) => Number(value.toFixed(decimals)), {
        dataType: "number",
        description: "at most the decimals",
        parameters: [{ label: "Decimals", type: "number", default: "1" }],
    }),
    // A place's general statistic, e.g. {{ stat: Current Season Pctl. }}
    stat: (place, key) => getPlaceMapStats(place)[key],
};

/**
 * Returns the only data template variables can read: the current place id, the report's data,
 * and TEMPLATE_FUNCTIONS.
 * @param {string} placeId - The currently selected place.
 * @returns {Object} The template context.
 */
function getTextEditorTemplateContext(placeId) {
    return {
        place: placeId,
        datasetProperties,
        parameters,
        place_general_stats,
        place_long_term_stats,
        seasonal_current_totals,
        seasonal_forecast_totals,
        seasonal_general_stats,
        selected_seasons_general_stats,
        seasonal_cumsum,
        seasonal_ensemble,
        seasonal_long_term_stats,
        selected_seasons_cumsum,
        selected_seasons_ensemble,
        selected_seasons_ensemble_with_forecast,
        selected_seasons_long_term_stats,
        ...TEMPLATE_FUNCTIONS,
    };
}

// Thrown while resolving a token, which is then left as typed; `warn` also logs the reason
class TemplateVariableError extends Error {
    constructor(message, warn = false) {
        super(message);
        this.warn = warn;
    }
}

function isOwnTemplateProperty(object, key) {
    return object !== null && typeof object === "object"
        && Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Consumes `pattern` from the start of the text left to parse.
 * @param {Object} parser - The parser state, {rest}.
 * @param {RegExp} pattern - A pattern anchored at the start (^).
 * @returns {Array|null} The match, or null if the text doesn't start with the pattern.
 */
function takeTemplatePattern(parser, pattern) {
    const match = pattern.exec(parser.rest);
    if (match) {
        parser.rest = parser.rest.slice(match[0].length);
    }
    return match;
}

/**
 * Consumes one punctuation character, if it is the next one in the text left to parse.
 * @param {Object} parser - The parser state, {rest}.
 * @param {string} character - "(", ")" or ",".
 * @returns {boolean} Whether it was consumed.
 */
function takeTemplatePunctuation(parser, character) {
    const match = TEMPLATE_PUNCTUATION_PATTERN.exec(parser.rest);
    if (!match || match[1] !== character) { return false; }
    parser.rest = parser.rest.slice(match[0].length);
    return true;
}

/**
 * Calls a template function. A function that throws or returns nothing makes the token invalid.
 * @param {string} name - The function's name, for the warning.
 * @param {Function} templateFunction - The function, from the template context.
 * @param {Array} args - The resolved arguments.
 * @returns {*} The function's result.
 */
function callTemplateFunction(name, templateFunction, args) {
    let result;
    try {
        result = templateFunction(...args);
    } catch (error) {
        throw new TemplateVariableError(`${name}() failed: ${error.message}`, true);
    }
    if (result === undefined) {
        throw new TemplateVariableError(`${name}() returned nothing`, true);
    }
    return result;
}

/**
 * Parses and resolves the arguments of a call, after its "(".
 * @param {Object} parser - The parser state, {rest}.
 * @param {Object} context - The template context.
 * @returns {Array} The resolved arguments.
 */
function parseTemplateArguments(parser, context) {
    const args = [];
    if (takeTemplatePunctuation(parser, ")")) { return args; }
    do {
        let match;
        if ((match = takeTemplatePattern(parser, TEMPLATE_NUMBER_PATTERN))) {
            args.push(Number(match[1]));
        } else if ((match = takeTemplatePattern(parser, TEMPLATE_STRING_PATTERN))) {
            args.push(match[1] ?? match[2]);
        } else {
            const value = parseTemplateExpression(parser, context);
            if (value === undefined) { throw new TemplateVariableError("an argument is undefined"); }
            args.push(value);
        }
    } while (takeTemplatePunctuation(parser, ","));
    if (!takeTemplatePunctuation(parser, ")")) { throw new TemplateVariableError("')' expected"); }
    return args;
}

/**
 * Parses and resolves one expression: a name, an optional call, then path segments. Names are
 * looked up as the context's own properties; segments walk own properties only, so inherited
 * members such as __proto__ or constructor never resolve. Only context functions can be called.
 * @param {Object} parser - The parser state, {rest}.
 * @param {Object} context - The template context.
 * @returns {*} The expression's value.
 */
function parseTemplateExpression(parser, context) {
    const start = takeTemplatePattern(parser, TEMPLATE_PATH_START_PATTERN);
    if (!start || !isOwnTemplateProperty(context, start[1])) {
        throw new TemplateVariableError("unknown name");
    }
    let value = context[start[1]];

    if (takeTemplatePunctuation(parser, "(")) {
        if (typeof value !== "function") { throw new TemplateVariableError(`${start[1]} is not a function`); }
        value = callTemplateFunction(start[1], value, parseTemplateArguments(parser, context));
    }

    let segment;
    while ((segment = takeTemplatePattern(parser, TEMPLATE_PATH_SEGMENT_PATTERN))) {
        let key = segment[1] ?? segment[2] ?? segment[3];
        if (segment[4] !== undefined) { // [variable]: the key is the context variable's value
            if (!isOwnTemplateProperty(context, segment[4])) { throw new TemplateVariableError("unknown name"); }
            key = context[segment[4]];
            if (typeof key !== "string" && typeof key !== "number") { throw new TemplateVariableError("invalid key"); }
        }
        if (!isOwnTemplateProperty(value, key)) { throw new TemplateVariableError("unknown key"); }
        value = value[key];
    }
    return value;
}

/**
 * Resolves a template expression, e.g. fixed(place_general_stats[place]["Current Season Pctl."], 1),
 * or the shorthand call "name: some text", which is name(place, "some text").
 * @param {string} text - The expression inside a {{ }} token.
 * @param {Object} context - The template context, see getTextEditorTemplateContext().
 * @param {boolean} warn - Whether to log failed function calls as console warnings.
 * @returns {string|number|boolean|undefined} The value, or undefined if the expression is invalid
 *   or doesn't end at a string, number or boolean.
 */
function resolveTemplateExpression(text, context, warn = true) {
    const parser = { rest: text };
    try {
        let value;
        const shorthand = TEMPLATE_SHORTHAND_PATTERN.exec(text);
        if (shorthand) {
            const name = shorthand[1];
            if (!isOwnTemplateProperty(context, name) || typeof context[name] !== "function") {
                throw new TemplateVariableError(`${name} is not a function`);
            }
            value = callTemplateFunction(name, context[name], [context.place, shorthand[2].trim()]);
        } else {
            value = parseTemplateExpression(parser, context);
            if (parser.rest.trim() !== "") { throw new TemplateVariableError("unexpected text"); }
        }
        return ["string", "number", "boolean"].includes(typeof value) ? value : undefined;
    } catch (error) {
        if (!(error instanceof TemplateVariableError)) { throw error; }
        if (error.warn && warn) {
            console.warn(`Template variable "{{ ${text} }}": ${error.message}`);
        }
        return undefined;
    }
}

/**
 * Normalizes a token's path as TinyMCE may save it: HTML entities (e.g. &quot;, &nbsp;) are
 * decoded, non-breaking spaces become normal spaces, and invisible zero-width characters
 * (e.g. the ones TinyMCE leaves around the caret) are removed.
 * @param {string} token - The path inside a {{ }} token, as found in the editor's HTML.
 * @returns {string} The cleaned path.
 */
function cleanTemplateToken(token) {
    templateTokenDecoder.innerHTML = token;
    return templateTokenDecoder.value
        .replaceAll(String.fromCharCode(0xA0), " ")
        .replace(/[​-‍⁠﻿]/g, "");
}

/**
 * Replaces every {{ expression }} token in the HTML with its HTML-escaped value from the context.
 * Unresolved tokens are left exactly as typed, so typos stay visible.
 * @param {string} html - The editor's HTML, with template variables.
 * @param {Object} context - The template context, see getTextEditorTemplateContext().
 * @returns {string} The HTML with the resolvable tokens filled in.
 */
function fillTemplateVariables(html, context) {
    return html.replace(TEMPLATE_VARIABLE_PATTERN, (token, path) => {
        const value = resolveTemplateExpression(cleanTemplateToken(path), context);
        return value === undefined ? token : escapeHtml(value);
    });
}

/**
 * Writes an object key as a quoted template path segment.
 * @param {string} key - The key.
 * @returns {string|null} "key" or 'key', or null if the key contains both kinds of quotes.
 */
function templateKeyLiteral(key) {
    if (!key.includes('"')) { return `"${key}"`; }
    if (!key.includes("'")) { return `'${key}'`; }
    return null;
}

/**
 * Returns the data type of the first string, number or boolean among the values.
 * @param {Iterable} values - The values to look at; null and missing values are skipped.
 * @returns {string|null} "string", "number" or "boolean", or null if there is none.
 */
function templateValueType(values) {
    for (const value of values) {
        if (["string", "number", "boolean"].includes(typeof value)) { return typeof value; }
    }
    return null;
}

/**
 * Lists the template variables offered by the insert dialog, from the current place's context.
 * Variables keyed by place ids are written with [place], so the tokens work for every place.
 * @param {string} placeId - The currently selected place.
 * @returns {Array<Object>} Items {group, label, expression, shorthand, length, dataType}:
 *   `expression` can be used as a function argument, `shorthand` (optional) is the preferred form
 *   without an applied function, `length` is set for lists, which need an index, and `dataType` is
 *   the type of the variable's values ("string", "number", "boolean", or null if unknown), taken
 *   from all places so that a value missing for the current place doesn't hide it.
 */
function getTemplateVariableCatalog(placeId) {
    const context = getTextEditorTemplateContext(placeId);
    const placeIds = datasetProperties["place_ids"].map(String);
    const placeIdSet = new Set(placeIds);
    const isValue = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);
    const items = [{ group: "Place", label: "Place id", expression: "place", dataType: "string" }];

    const placeMapStats = placeIds.map((id) => getPlaceMapStats(id));
    for (const key of Object.keys(getPlaceMapStats(placeId))) {
        const keyText = templateKeyLiteral(key);
        if (key === "None" || keyText === null) { continue; }
        items.push({ group: "Map statistics", label: key,
            expression: `stat(place, ${keyText})`, shorthand: `stat: ${key}`,
            dataType: templateValueType(placeMapStats.map((stats) => stats[key])) });
    }

    for (const [name, value] of Object.entries(context)) {
        if (name === "place" || value === null || typeof value !== "object") { continue; }
        const keys = Object.keys(value);
        const keyedByPlace = !Array.isArray(value) && keys.length > 0 && keys.every((key) => placeIdSet.has(key));
        const base = keyedByPlace ? `${name}[place]` : name;
        const entries = keyedByPlace ? value[placeId] : value;
        // The variable's values for every place, for the data type
        const allEntries = keyedByPlace ? placeIds.map((id) => value[id]) : [value];
        if (entries === null || typeof entries !== "object") { continue; }
        if (Array.isArray(entries)) {
            items.push({ group: name, label: name, expression: base, length: entries.length,
                dataType: templateValueType(allEntries.flat()) });
            continue;
        }
        for (const [key, entry] of Object.entries(entries)) {
            const keyText = templateKeyLiteral(key);
            if (keyText === null) { continue; }
            const expression = `${base}[${keyText}]`;
            const allValues = allEntries.map((placeEntries) => placeEntries && placeEntries[key]);
            if (Array.isArray(entry)) {
                items.push({ group: name, label: key, expression, length: entry.length,
                    dataType: templateValueType(allValues.flat()) });
            } else if (isValue(entry)) {
                items.push({ group: name, label: key, expression, dataType: templateValueType(allValues) });
            }
        }
    }
    return items;
}

/**
 * Opens a dialog to pick a template variable by group, list or search, optionally with an
 * index and an applied function for its data type, and inserts it as a {{ }} token at the cursor.
 * @param {Object} editor - The TinyMCE editor.
 * @param {string} placeId - The currently selected place, used for the item list and the preview.
 */
function openTemplateVariableDialog(editor, placeId) {
    const catalog = getTemplateVariableCatalog(placeId);
    const context = getTextEditorTemplateContext(placeId);
    const groups = [...new Set(catalog.map((item) => item.group))];
    // Context functions that can be applied to a variable, see TEMPLATE_FUNCTIONS
    const appliedFunctions = Object.entries(context)
        .filter(([name, value]) => typeof value === "function" && value.dataType);

    const filterItems = (data) => {
        const search = data.search.trim().toLowerCase();
        return catalog
            .map((item, index) => ({ item, value: String(index) }))
            .filter(({ item }) => (data.group === "" || item.group === data.group)
                && (search === "" || `${item.group} ${item.label} ${item.expression}`.toLowerCase().includes(search)));
    };

    // Index, function and argument fields only exist while needed, so missing values get defaults
    const defaultData = { search: "", group: "", item: "", index: "0", applied: "" };

    // Completes the dialog's data and keeps the selections valid for the current filters
    const normalizeData = (dialogData) => {
        const data = { ...defaultData, ...dialogData };
        const filtered = filterItems(data);
        if (!filtered.some(({ value }) => value === data.item)) {
            data.item = filtered.length ? filtered[0].value : "";
        }
        const item = catalog[Number(data.item)];
        const functions = item ? appliedFunctions.filter(([, value]) => value.dataType === item.dataType) : [];
        if (!functions.some(([name]) => name === data.applied)) {
            data.applied = "";
        }
        const applied = data.applied ? context[data.applied] : null;
        (applied ? applied.parameters : []).forEach((argument, index) => {
            if (data[`argument${index}`] === undefined) { data[`argument${index}`] = argument.default; }
        });
        return { data, filtered, item, functions, applied };
    };

    // The token's expression, or null if no variable is selected
    const buildExpression = ({ data, item, applied }) => {
        if (!item) { return null; }
        let expression = item.expression;
        if (item.length !== undefined) {
            const index = Math.min(Math.max(parseInt(data.index, 10) || 0, 0), item.length - 1);
            expression += `[${index}]`;
        } else if (!applied && item.shorthand) {
            return item.shorthand;
        }
        if (applied) {
            const args = [expression];
            // Arguments left empty, and the ones after them, use the function's own defaults
            for (const [index, argument] of applied.parameters.entries()) {
                const text = data[`argument${index}`].trim();
                if (text === "") { break; }
                if (argument.type === "number") {
                    const number = Number(text);
                    if (!Number.isFinite(number)) { break; }
                    args.push(String(number));
                } else {
                    const literal = templateKeyLiteral(text);
                    if (literal === null) { break; }
                    args.push(literal);
                }
            }
            expression = `${data.applied}(${args.join(", ")})`;
        }
        return expression;
    };

    const buildPreview = (expression) => {
        if (expression === null) { return "<p>Select a variable.</p>"; }
        const value = resolveTemplateExpression(expression, context, false);
        const valueText = value === undefined ? "<em>no value for this place</em>"
            : `<strong>${escapeHtml(value)}</strong>`;
        return `<p><code>${escapeHtml(`{{ ${expression} }}`)}</code></p>`
            + `<p>Value for place ${escapeHtml(placeId)}: ${valueText}</p>`;
    };

    const makeSpec = (dialogData) => {
        const state = normalizeData(dialogData);
        const { data, filtered, item, functions, applied } = state;
        const expression = buildExpression(state);
        return {
            title: "Insert template variable",
            body: {
                type: "panel",
                items: [
                    { type: "input", name: "search", label: "Search", placeholder: "Search all variables" },
                    { type: "listbox", name: "group", label: "Group",
                        items: [{ text: "All", value: "" }, ...groups.map((group) => ({ text: group, value: group }))] },
                    { type: "listbox", name: "item", label: "Variable",
                        items: filtered.length
                            ? filtered.map(({ item, value }) => ({
                                text: data.group === "" ? `${item.group}: ${item.label}` : item.label, value }))
                            : [{ text: "No matches", value: "" }] },
                    ...(item && item.length !== undefined
                        ? [{ type: "input", name: "index", label: `Index (0 to ${item.length - 1})`, inputMode: "numeric" }]
                        : []),
                    // Only functions for the variable's data type; disabled when there are none
                    { type: "listbox", name: "applied", label: "Applied function", enabled: functions.length > 0,
                        items: [{ text: "None", value: "" },
                            ...functions.map(([name, value]) => ({ text: `${name}: ${value.description}`, value: name }))] },
                    ...(applied ? applied.parameters.map((argument, index) => ({
                        type: "input", name: `argument${index}`, label: argument.label,
                        inputMode: argument.type === "number" ? "numeric" : "text" })) : []),
                    { type: "htmlpanel", html: buildPreview(expression) },
                ],
            },
            initialData: data,
            buttons: [
                { type: "cancel", text: "Cancel" },
                { type: "submit", text: "Insert", primary: true, enabled: expression !== null },
            ],
            // Listboxes can't filter themselves, so the dialog is rebuilt on every change
            onChange: (api, details) => {
                api.redial(makeSpec(api.getData()));
                api.focus(details.name);
            },
            onSubmit: (api) => {
                const token = buildExpression(normalizeData(api.getData()));
                if (token === null) { return; }
                api.close();
                // Quotes stay as typed: TinyMCE locks tokens on the raw HTML, keeping entities as text
                editor.insertContent(`{{ ${token} }}`
                    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
            },
        };
    };

    editor.windowManager.open(makeSpec(defaultData));
}

class RichTextEditor {
    /**
     * @param {d3.Selection} containerElement - The element to build the editor into.
     * @param {Object} options - Initial options: {editMode, text}.
     */
    constructor(containerElement, options={}) {
        this.options = {
            editMode: options.editMode ?? false,
            text: options.text ?? "",
        };
        this.editor = null; // set once TinyMCE is ready
        this.pendingEditor = null; // the instance, from its creation, so destroy() can remove it early
        this.destroyed = false;
        this.placeId = null;

        this.editorContainer = containerElement.append("div")
            .attr("class", "text-editor-container");
        const editorHost = this.editorContainer.append("div")
            .attr("class", "text-editor-host");
        const textArea = editorHost.append("textarea");

        this.changeEditMode(this.options.editMode);

        // TinyMCE initializes asynchronously; options set before then are applied once it is ready.
        // Its promise never resolves if the target is detached first, hence pendingEditor.
        tinymce.init({
            ...TEXT_EDITOR_TINYMCE_OPTIONS,
            target: textArea.node(),
            // Template variables become locked pieces. No capture group: TinyMCE would only
            // show the group's text, hiding the braces.
            noneditable_regexp: /\{\{.+?\}\}/g,
            setup: (editor) => {
                this.pendingEditor = editor;
                editor.on("SetContent", () => this.highlightTemplateTokens());
                editor.ui.registry.addButton("templatevariable", {
                    icon: "addtag",
                    tooltip: "Template variable",
                    onAction: () => openTemplateVariableDialog(editor, this.placeId),
                });
            },
        })
            .then((editors) => {
                const editor = editors[0];
                if (this.destroyed) { return; }
                if (!editor) {
                    console.error("The rich text editor could not be created.");
                    return;
                }
                this.editor = editor;
                this.render();
            })
            .catch((error) => {
                console.error("The rich text editor could not be created.", error);
            });
    }

    /**
     * Saves the typed document into options.text. Only edit mode shows the template itself;
     * view mode shows a filled-in copy, which must never replace it.
     */
    saveTemplate() {
        if (this.editor && this.options.editMode) {
            this.options.text = this.editor.getContent();
        }
    }

    /**
     * Loads the document for the current mode: the template in edit mode, and in view mode a
     * read-only copy with the template variables filled in for the current place.
     */
    render() {
        this.editorContainer.classed("text-editor-view", !this.options.editMode);
        if (!this.editor) { return; }
        const content = this.options.editMode ? this.options.text
            : fillTemplateVariables(this.options.text, getTextEditorTemplateContext(this.placeId));
        // content is loaded while editable, then set read-only in view mode
        this.editor.mode.set("design");
        this.editor.setContent(content);
        // so undo can't bring back filled-in values in place of the template variables
        this.editor.undoManager.clear();
        if (!this.options.editMode) {
            this.editor.mode.set("readonly");
        }
    }

    /**
     * Switches between edit mode (editable, with toolbar) and view mode (read-only, no toolbar).
     * @param {boolean} state - True for edit mode, false for view mode.
     */
    changeEditMode(state) {
        this.saveTemplate();
        this.options.editMode = state;
        this.render();
    }

    /**
     * In edit mode, marks the template variables that don't resolve for the current place.
     */
    highlightTemplateTokens() {
        if (!this.editor || !this.options.editMode) { return; }
        const context = getTextEditorTemplateContext(this.placeId);
        for (const token of this.editor.getBody().querySelectorAll(".template-token")) {
            // data-mce-content holds the token exactly as typed
            const tokenText = token.getAttribute("data-mce-content") ?? token.textContent;
            const match = new RegExp(TEMPLATE_VARIABLE_PATTERN.source).exec(tokenText);
            const valid = match !== null
                && resolveTemplateExpression(cleanTemplateToken(match[1]), context, false) !== undefined;
            token.classList.toggle("template-token-invalid", !valid);
        }
    }

    update(index) {
        this.placeId = index;
        if (this.options.editMode) {
            this.highlightTemplateTokens();
        } else {
            this.render();
        }
    }

    resize(size) {}

    getProperties() {
        this.saveTemplate();
        return {...this.options};
    }

    /**
     * Applies a patch of options, in the same shape returned by getProperties().
     * @param {Object} properties - A subset of {editMode, text}; text is the document's HTML,
     *   with template variables.
     */
    setProperties(properties) {
        this.saveTemplate();
        if ("text" in properties) {
            this.options.text = properties.text;
        }
        if ("editMode" in properties) {
            this.options.editMode = properties.editMode;
        }
        this.render();
    }

    /**
     * Removes the TinyMCE editor instance, including one still initializing.
     */
    destroy() {
        this.destroyed = true;
        const editor = this.editor ?? this.pendingEditor;
        if (editor) {
            editor.remove();
        }
        this.editor = null;
        this.pendingEditor = null;
    }
}

function makeTextEditorCard(containerElement) {
    return {
        "editor": new RichTextEditor(containerElement),
    };
}
