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
// ["key"] | [0] | [-1] | [variable], where a negative index counts from the end of a list
// (-1 is the last element) and [variable] uses a context variable's value as the key,
// e.g. [place]; literal keys and strings must use double quotes
const TEMPLATE_PATH_SEGMENT_PATTERN =
    /^\s*\[\s*(?:"([^"]*)"|(-?\d+)|([A-Za-z_$][\w$]*))\s*\]/;
const TEMPLATE_NUMBER_PATTERN = /^\s*(-?\d+(?:\.\d+)?)/;
const TEMPLATE_STRING_PATTERN = /^\s*"([^"]*)"/;
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
// Calls must pass exactly the function's parameters, so parameters have no default values.
const TEMPLATE_FUNCTIONS = {
    // Exactly `decimals` decimals, e.g. fixed(83.7, 2) gives "83.70"
    fixed: Object.assign((value, decimals) => value.toFixed(decimals), {
        dataType: "number",
        description: "exactly the decimals",
        parameters: [{ label: "Decimals", type: "number", default: "1" }],
    }),
    // At most `decimals` decimals, e.g. round(83.7, 2) gives 83.7
    round: Object.assign((value, decimals) => Number(value.toFixed(decimals)), {
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
 * Calls a template function. A call with a different number of arguments than the function's
 * parameters, or a function that throws or returns nothing, makes the token invalid.
 * @param {string} name - The function's name, for the warning.
 * @param {Function} templateFunction - The function, from the template context.
 * @param {Array} args - The resolved arguments.
 * @returns {*} The function's result.
 */
function callTemplateFunction(name, templateFunction, args) {
    if (args.length !== templateFunction.length) {
        throw new TemplateVariableError(
            `${name}() takes ${templateFunction.length} arguments, but got ${args.length}`, true);
    }
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
 * Parses one expression into its parts without resolving it: a name, the call's arguments
 * (null if it isn't a call), and the path segments.
 * @param {Object} parser - The parser state, {rest}.
 * @returns {Object} {name, args, segments}: args are {number}, {string} or {expression}, and
 *   segments are {key}, {index} or {variable}.
 */
function parseTemplateStructureExpression(parser) {
    const start = takeTemplatePattern(parser, TEMPLATE_PATH_START_PATTERN);
    if (!start) { throw new TemplateVariableError("a name was expected"); }
    let args = null;
    if (takeTemplatePunctuation(parser, "(")) {
        args = [];
        if (!takeTemplatePunctuation(parser, ")")) {
            do {
                let match;
                if ((match = takeTemplatePattern(parser, TEMPLATE_NUMBER_PATTERN))) {
                    args.push({ number: Number(match[1]) });
                } else if ((match = takeTemplatePattern(parser, TEMPLATE_STRING_PATTERN))) {
                    args.push({ string: match[1] });
                } else {
                    args.push({ expression: parseTemplateStructureExpression(parser) });
                }
            } while (takeTemplatePunctuation(parser, ","));
            if (!takeTemplatePunctuation(parser, ")")) { throw new TemplateVariableError("')' expected"); }
        }
    }
    const segments = [];
    let segment;
    while ((segment = takeTemplatePattern(parser, TEMPLATE_PATH_SEGMENT_PATTERN))) {
        if (segment[1] !== undefined) {
            segments.push({ key: segment[1] });
        } else if (segment[2] !== undefined) {
            segments.push({ index: Number(segment[2]) });
        } else {
            segments.push({ variable: segment[3] });
        }
    }
    return { name: start[1], args, segments };
}

/**
 * Parses a template expression into its parts, with the same syntax as resolveTemplateExpression().
 * @param {string} text - The expression inside a {{ }} token.
 * @returns {Object|null} {shorthand: {name, text}} or {expression}, see
 *   parseTemplateStructureExpression(), or null if the text isn't valid syntax.
 */
function parseTemplateStructure(text) {
    const shorthand = TEMPLATE_SHORTHAND_PATTERN.exec(text);
    if (shorthand) {
        return { shorthand: { name: shorthand[1], text: shorthand[2].trim() } };
    }
    const parser = { rest: text };
    try {
        const expression = parseTemplateStructureExpression(parser);
        return parser.rest.trim() === "" ? { expression } : null;
    } catch (error) {
        if (error instanceof TemplateVariableError) { return null; }
        throw error;
    }
}

/**
 * Writes a parsed expression in the dialog's standard form: double quotes, ", " between arguments.
 * @param {Object} expression - A parsed expression, see parseTemplateStructureExpression().
 * @returns {string} The expression's text.
 */
function serializeTemplateStructure(expression) {
    const args = expression.args === null ? "" : `(${expression.args.map((arg) => {
        if (arg.number !== undefined) { return String(arg.number); }
        if (arg.string !== undefined) { return `"${arg.string}"`; }
        return serializeTemplateStructure(arg.expression);
    }).join(", ")})`;
    const segments = expression.segments.map((segment) => {
        if (segment.key !== undefined) { return `["${segment.key}"]`; }
        if (segment.index !== undefined) { return `[${segment.index}]`; }
        return `[${segment.variable}]`;
    }).join("");
    return `${expression.name}${args}${segments}`;
}

/**
 * Evaluates one parsed expression: a name, an optional call, then path segments. Names are
 * looked up as the context's own properties; segments walk own properties only, so inherited
 * members such as __proto__ or constructor never resolve. Only context functions can be called.
 * @param {Object} expression - A parsed expression, see parseTemplateStructureExpression().
 * @param {Object} context - The template context.
 * @returns {*} The expression's value.
 */
function evaluateTemplateStructureExpression(expression, context) {
    if (!isOwnTemplateProperty(context, expression.name)) {
        throw new TemplateVariableError("unknown name");
    }
    let value = context[expression.name];

    if (expression.args !== null) {
        if (typeof value !== "function") { throw new TemplateVariableError(`${expression.name} is not a function`); }
        const args = expression.args.map((arg) => {
            if (arg.number !== undefined) { return arg.number; }
            if (arg.string !== undefined) { return arg.string; }
            const argValue = evaluateTemplateStructureExpression(arg.expression, context);
            if (argValue === undefined) { throw new TemplateVariableError("an argument is undefined"); }
            return argValue;
        });
        value = callTemplateFunction(expression.name, value, args);
    }

    for (const segment of expression.segments) {
        let key = segment.key ?? segment.index;
        if (segment.index !== undefined && segment.index < 0) { // [-n]: counts from the end of a list
            if (!Array.isArray(value)) { throw new TemplateVariableError("negative index on a non-list"); }
            key = value.length + segment.index;
        }
        if (segment.variable !== undefined) { // [variable]: the key is the context variable's value
            if (!isOwnTemplateProperty(context, segment.variable)) { throw new TemplateVariableError("unknown name"); }
            key = context[segment.variable];
            if (typeof key !== "string" && typeof key !== "number") { throw new TemplateVariableError("invalid key"); }
        }
        if (!isOwnTemplateProperty(value, key)) { throw new TemplateVariableError("unknown key"); }
        value = value[key];
    }
    return value;
}

/**
 * Evaluates a parsed template expression, including the shorthand call "name: some text",
 * which is name(place, "some text").
 * @param {Object} structure - A parsed template expression, see parseTemplateStructure().
 * @param {Object} context - The template context.
 * @returns {*} The expression's value.
 */
function evaluateTemplateStructure(structure, context) {
    if (structure.shorthand) {
        const { name, text } = structure.shorthand;
        if (!isOwnTemplateProperty(context, name) || typeof context[name] !== "function") {
            throw new TemplateVariableError(`${name} is not a function`);
        }
        return callTemplateFunction(name, context[name], [context.place, text]);
    }
    return evaluateTemplateStructureExpression(structure.expression, context);
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
    // Invalid syntax is never evaluated, and isn't warned about
    const structure = parseTemplateStructure(text);
    if (structure === null) { return undefined; }
    try {
        const value = evaluateTemplateStructure(structure, context);
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
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
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
 * Writes a key or string as a double-quoted template literal.
 * @param {string} key - The key or string.
 * @returns {string|null} "key", or null if it contains a double quote, which can't be written.
 */
function templateKeyLiteral(key) {
    return key.includes('"') ? null : `"${key}"`;
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
 * Turns a token's expression into the dialog's data, filling its fields in order (group,
 * variable, index, applied function, arguments). The first part that isn't valid, and every
 * part after it, keep their defaults, and a note explains what was reset.
 * @param {string} text - The token's expression.
 * @param {Array<Object>} catalog - The dialog's variables, see getTemplateVariableCatalog().
 * @param {Object} context - The template context.
 * @param {Object} defaultData - The dialog's default data.
 * @returns {Object} {data, note, statForm}: `note` is null if everything was recognized, and
 *   `statForm` is "call" if a stat() variable was written as a call instead of as a shorthand.
 */
function getTemplateDialogDataForToken(text, catalog, context, defaultData) {
    const data = { ...defaultData };
    const result = (note, statForm = "shorthand") => ({ data, note, statForm });
    const structure = parseTemplateStructure(text);
    if (structure === null) { return result("it isn't a valid template expression"); }

    // Group and variable
    let item;
    let expression = null;
    let statForm = "shorthand";
    let applied = null;
    let appliedArgs = [];
    let index = null;
    if (structure.shorthand) {
        item = catalog.find((entry) => entry.shorthand === `${structure.shorthand.name}: ${structure.shorthand.text}`);
    } else {
        expression = structure.expression;
        const fn = isOwnTemplateProperty(context, expression.name) ? context[expression.name] : null;
        // A function applied to a variable, which is its first argument
        if (typeof fn === "function" && fn.dataType && expression.segments.length === 0
                && expression.args && expression.args.length > 0 && expression.args[0].expression) {
            applied = expression.name;
            appliedArgs = expression.args.slice(1);
            expression = expression.args[0].expression;
        }
        const written = serializeTemplateStructure(expression);
        item = catalog.find((entry) => entry.length === undefined && entry.expression === written);
        const last = expression.segments[expression.segments.length - 1];
        if (!item && last && last.index !== undefined) {
            const base = serializeTemplateStructure({ ...expression, segments: expression.segments.slice(0, -1) });
            item = catalog.find((entry) => entry.length !== undefined && entry.expression === base);
            index = last.index;
        }
        // A list written without its index: the variable is right, the index is missing
        if (!item) {
            item = catalog.find((entry) => entry.length !== undefined && entry.expression === written);
        }
        if (item && item.shorthand) { statForm = "call"; }
    }
    if (!item) {
        const name = structure.shorthand ? structure.shorthand.name : expression.name;
        const group = name === "stat" ? "Map statistics" : name;
        if (catalog.some((entry) => entry.group === group)) { data.group = group; }
        return result("its variable isn't available");
    }
    data.group = item.group;
    data.item = String(catalog.indexOf(item));

    // Index
    if (item.length !== undefined) {
        if (index === null) {
            return result("its index is missing", statForm);
        }
        if (index >= item.length || index < -item.length) {
            return result(`its index is out of range (0 to ${item.length - 1}, or -1 to -${item.length})`, statForm);
        }
        data.index = String(index);
    }

    // Applied function and its arguments
    if (applied === null) { return result(null, statForm); }
    const fn = context[applied];
    if (fn.dataType !== item.dataType) {
        return result(`${applied}() doesn't apply to this variable's data type`, statForm);
    }
    data.applied = applied;
    if (appliedArgs.length !== fn.parameters.length) {
        return result(`${applied}() has the wrong number of arguments`, statForm);
    }
    for (const [position, parameter] of fn.parameters.entries()) {
        const arg = appliedArgs[position];
        const value = parameter.type === "number" ? arg.number : arg.string;
        if (value === undefined) {
            return result(`${applied}()'s ${parameter.label.toLowerCase()} isn't a ${parameter.type}`, statForm);
        }
        data[`argument${position}`] = String(value);
    }
    return result(null, statForm);
}

/**
 * Opens a dialog to pick a template variable by group, list or search, optionally with an
 * index and an applied function for its data type. Without a token, it inserts a new {{ }}
 * token at the cursor; with a token, it is prefilled from it and replaces it.
 * @param {Object} editor - The TinyMCE editor.
 * @param {string} placeId - The currently selected place, used for the item list and the preview.
 * @param {Element} tokenNode - Optional: the token element (span.template-token) to edit.
 */
function openTemplateVariableDialog(editor, placeId, tokenNode = null) {
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

    // When editing, the dialog starts from the token, and keeps the form its stat() was written in
    let initialData = defaultData;
    let note = null;
    let statForm = "shorthand";
    let originalText = null;
    if (tokenNode) {
        const tokenMatch = new RegExp(TEMPLATE_VARIABLE_PATTERN.source)
            .exec(tokenNode.getAttribute("data-mce-content") ?? tokenNode.textContent);
        originalText = tokenMatch ? cleanTemplateToken(tokenMatch[1]) : "";
        ({ data: initialData, note, statForm } = getTemplateDialogDataForToken(originalText, catalog, context, defaultData));
    }

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
        (applied ? applied.parameters : []).forEach((parameter, index) => {
            if (data[`argument${index}`] === undefined) { data[`argument${index}`] = parameter.default; }
        });
        return { data, filtered, item, functions, applied };
    };

    // The token's expression, or null if no variable is selected. Calls always get every
    // argument; an empty or invalid one is written as the parameter's default.
    const buildExpression = ({ data, item, applied }) => {
        if (!item) { return null; }
        let expression = item.expression;
        if (item.length !== undefined) {
            const index = Math.min(Math.max(parseInt(data.index, 10) || 0, -item.length), item.length - 1);
            expression += `[${index}]`;
        } else if (!applied && item.shorthand && statForm === "shorthand") {
            return item.shorthand;
        }
        if (applied) {
            const args = [expression];
            for (const [index, parameter] of applied.parameters.entries()) {
                const text = data[`argument${index}`].trim();
                if (parameter.type === "number") {
                    const number = Number(text);
                    args.push(String(text !== "" && Number.isFinite(number) ? number : Number(parameter.default)));
                } else {
                    args.push(templateKeyLiteral(text) ?? `"${parameter.default}"`);
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

    const noteHtml = note === null ? null
        : `<p><strong>${escapeHtml(`{{ ${originalText} }}`)}</strong> couldn't be fully recognized:`
            + ` ${escapeHtml(note)}. That part and the ones after it were reset.</p>`;

    const makeSpec = (dialogData) => {
        const state = normalizeData(dialogData);
        const { data, filtered, item, functions, applied } = state;
        const expression = buildExpression(state);
        return {
            title: tokenNode ? "Edit template variable" : "Insert template variable",
            body: {
                type: "panel",
                items: [
                    ...(noteHtml ? [{ type: "htmlpanel", html: noteHtml }] : []),
                    { type: "input", name: "search", label: "Search", placeholder: "Search all variables" },
                    { type: "listbox", name: "group", label: "Group",
                        items: [{ text: "All", value: "" }, ...groups.map((group) => ({ text: group, value: group }))] },
                    { type: "listbox", name: "item", label: "Variable",
                        items: filtered.length
                            ? filtered.map(({ item, value }) => ({
                                text: data.group === "" ? `${item.group}: ${item.label}` : item.label, value }))
                            : [{ text: "No matches", value: "" }] },
                    ...(item && item.length !== undefined
                        ? [{ type: "input", name: "index", label: `Index (0 to ${item.length - 1}, or -1 to -${item.length} from the end)`, inputMode: "numeric" }]
                        : []),
                    // Only functions for the variable's data type; disabled when there are none
                    { type: "listbox", name: "applied", label: "Applied function", enabled: functions.length > 0,
                        items: [{ text: "None", value: "" },
                            ...functions.map(([name, value]) => ({ text: `${name}: ${value.description}`, value: name }))] },
                    ...(applied ? applied.parameters.map((parameter, index) => ({
                        type: "input", name: `argument${index}`, label: parameter.label,
                        inputMode: parameter.type === "number" ? "numeric" : "text" })) : []),
                    { type: "htmlpanel", html: buildPreview(expression) },
                ],
            },
            initialData: data,
            buttons: [
                { type: "cancel", text: "Cancel" },
                { type: "submit", text: tokenNode ? "Save" : "Insert", primary: true, enabled: expression !== null },
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
                // Editing replaces the token, which insertContent() does for a selected node
                if (tokenNode && tokenNode.isConnected) {
                    editor.selection.select(tokenNode);
                }
                // Quotes stay as typed: TinyMCE locks tokens on the raw HTML, keeping entities as text
                editor.insertContent(`{{ ${token} }}`
                    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
            },
        };
    };

    editor.windowManager.open(makeSpec(initialData));
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
                // Inserts a template variable, or edits the selected one
                editor.ui.registry.addButton("templatevariable", {
                    icon: "addtag",
                    tooltip: "Template variable",
                    onAction: () => {
                        const node = editor.selection.getNode();
                        const token = node && node.closest ? node.closest(".template-token") : null;
                        openTemplateVariableDialog(editor, this.placeId, token);
                    },
                });
                // Small toolbar on a clicked template variable, to edit it
                editor.ui.registry.addContextToolbar("templatetoken", {
                    predicate: (node) => node.classList !== undefined && node.classList.contains("template-token"),
                    items: "templatevariable",
                    position: "node",
                    scope: "node",
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
