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
    content_style: "body.mce-content-readonly { caret-color: transparent; }",
    // Elements that aren't text formatting are removed, from any source (typing, pasting,
    // the code view, layout.js).
    invalid_elements: "script,noscript,style,link,meta,base,template,"
        + "form,input,button,select,option,optgroup,textarea,label,fieldset,"
        + "legend,datalist,output,iframe,frame,frameset,object,embed,applet,"
        + "param,video,audio,source,track,canvas,svg,math,dialog",
    license_key: "gpl",
    plugins: "lists link table code",
    toolbar: "undo redo | blocks | bold italic underline | bullist numlist | link table | code",
    menubar: false,
    ui_mode: "split", // keeps menus and popups inside the card instead of on <body>
    promotion: false,
    branding: false,
    statusbar: false,
    resize: false,
    height: "100%",
};

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
            setup: (editor) => { this.pendingEditor = editor; },
        })
            .then((editors) => {
                const editor = editors[0];
                if (this.destroyed) { return; }
                if (!editor) {
                    console.error("The rich text editor could not be created.");
                    return;
                }
                this.editor = editor;
                this.editor.setContent(this.options.text);
                this.changeEditMode(this.options.editMode);
            })
            .catch((error) => {
                console.error("The rich text editor could not be created.", error);
            });
    }

    /**
     * Switches between edit mode (editable, with toolbar) and view mode (read-only, no toolbar).
     * @param {boolean} state - True for edit mode, false for view mode.
     */
    changeEditMode(state) {
        this.options.editMode = state;
        this.editorContainer.classed("text-editor-view", !state);
        if (this.editor) {
            this.editor.mode.set(state ? "design" : "readonly");
        }
    }

    update(index) {
        this.placeId = index;
    }

    resize(size) {}

    getProperties() {
        if (this.editor) {
            this.options.text = this.editor.getContent();
        }
        return {...this.options};
    }

    /**
     * Applies a patch of options, in the same shape returned by getProperties().
     * @param {Object} properties - A subset of {editMode, text}; text is the document's HTML.
     */
    setProperties(properties) {
        if ("text" in properties) {
            this.options.text = properties.text;
            if (this.editor) {
                // content is loaded while editable, then the mode is restored below
                this.editor.mode.set("design");
                this.editor.setContent(this.options.text);
            }
        }
        this.changeEditMode(properties.editMode ?? this.options.editMode);
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
