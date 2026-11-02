"use strict";
function cropCanvas(canvas, x1, y1, x2, y2) {
    // Get cropped original canvas data
    var imgData = canvas.getContext('2d').getImageData(x1, y1, x2, y2);

    // Create a new temporary canvas
    var tempCanvas = document.createElement('canvas');
    var tempContext = tempCanvas.getContext('2d');
    tempCanvas.width = x2 - x1;
    tempCanvas.height = y2 - y1;
    tempContext.putImageData(imgData, 0, 0);

    return tempCanvas;
}

// The attribute that pairs a text card's iframe with its copy in html2canvas's cloned page
const CAPTURE_TEXT_KEY = 'data-capture-text-key';

/**
 * Captures the visible part of each text card's content. html2canvas draws an iframe blank, and
 * the Rich Text cards draw their content in one (TinyMCE's), so each is captured from its own
 * document first, then put in its iframe's place in the clone (see replaceTextFrames()).
 * Each iframe is marked with CAPTURE_TEXT_KEY, removed again by unmarkTextFrames().
 * @param {HTMLElement} node - The element being saved.
 * @returns {Promise<Object>} The captures, {url, width, height} with the iframe's size, keyed by
 *     CAPTURE_TEXT_KEY's value.
 */
function captureTextFrames(node) {
    const frames = Array.from(node.querySelectorAll('.text-editor-container iframe'));
    const captures = frames.map((frame, index) => {
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        // hidden cards (no size) and frames not loaded yet are left as they are
        if (!frameDocument?.documentElement || frame.clientWidth === 0 || frame.clientHeight === 0) {
            return null;
        }
        frame.setAttribute(CAPTURE_TEXT_KEY, index);
        // only what is in view, as on the screen: the text scrolled to, at the frame's size
        return html2canvas(frameDocument.documentElement, {
            'x': frameWindow.scrollX,
            'y': frameWindow.scrollY,
            'width': frame.clientWidth,
            'height': frame.clientHeight,
            'windowWidth': frame.clientWidth,
            'windowHeight': frame.clientHeight,
            'backgroundColor': null,
            'logging': false,
            // html2canvas adds its <style> as the body's first child, where the text's
            // "body > :first-child" rule would match it instead of the first block; in the head,
            // the first block keeps its dropped top margin
            'onclone': (clonedDocument) => {
                clonedDocument.head.append(...clonedDocument.body.querySelectorAll(':scope > style'));
            },
        })
            .then((canvas) => [index, {url: canvas.toDataURL(), width: frame.clientWidth, height: frame.clientHeight}])
            .catch((error) => {
                console.error('A text card could not be captured.', error);
                return null;
            });
    });
    return Promise.all(captures)
        .then((results) => Object.fromEntries(results.filter((result) => result !== null)));
}

/**
 * Replaces the text cards' iframes in html2canvas's cloned page with their captures, at the
 * same size. The captures are transparent: an image takes its iframe's classes, so the page's
 * styles for the iframe (TinyMCE's white background) apply to it too.
 * html2canvas only waits for the clone's images in WebKit and Blink browsers, and Firefox decodes
 * even a data URL later, so it would draw them with no size: onclone returns the promise.
 * @param {Document} clonedDocument - The clone, from html2canvas's onclone.
 * @param {Object} captures - From captureTextFrames().
 * @returns {Promise} Resolved once the images are decoded (or failed to).
 */
function replaceTextFrames(clonedDocument, captures) {
    const decoded = [];
    clonedDocument.querySelectorAll(`iframe[${CAPTURE_TEXT_KEY}]`).forEach((frame) => {
        const capture = captures[frame.getAttribute(CAPTURE_TEXT_KEY)];
        if (capture === undefined) { return; }
        const image = clonedDocument.createElement('img');
        image.src = capture.url;
        image.className = frame.className;
        image.style.width = `${capture.width}px`;
        image.style.height = `${capture.height}px`;
        frame.replaceWith(image);
        decoded.push(image.decode().catch((error) => {
            console.error('A text card capture could not be decoded.', error);
        }));
    });
    return Promise.all(decoded);
}

/**
 * Removes the marks captureTextFrames() put on the iframes.
 * @param {HTMLElement} node - The element being saved.
 */
function unmarkTextFrames(node) {
    node.querySelectorAll(`iframe[${CAPTURE_TEXT_KEY}]`)
        .forEach((frame) => frame.removeAttribute(CAPTURE_TEXT_KEY));
}

function save_reports() {
    let node = null;

    let params = getHashParamsObject();
    node = document.getElementById('contentRoot');
    let filename = params['place'];
    
    // add offset to fix bad rendering
    const zoom = window.devicePixelRatio;
    // set before html2canvas runs, from captureTextFrames()
    let textCaptures = {};
    const options = {
        'width': node.scrollWidth + node.offsetLeft, 
        'height': node.scrollHeight + node.offsetTop,
        'windowWidth': node.outerWidth,
        'windowHeight': node.outerHeight,
        'backgroundColor': null,
        'ignoreElements': (element) => {
            return element.classList.contains('capture-ignore');
        },
        'onclone': rootElement => {
            // html2canvas waits for it, see replaceTextFrames()
            const textImagesDecoded = replaceTextFrames(rootElement, textCaptures);
            // Workaround for zoomed document
            if (zoom === 1.0) {
                return textImagesDecoded;
            }
            const allElements = rootElement.querySelectorAll('*');
            Array.from(allElements).forEach(element => {
                if (!element) {
                    return
                }
                element.style.boxShadow = 'none';
                const style = element.style;
                style.setProperty('box-shadow', 'none', 'important');
            });
            return textImagesDecoded;
            },
        'logging': false,
    }

    captureTextFrames(node)
        .then((captures) => {
            textCaptures = captures;
            return html2canvas(node, options);
        })
        .then(function (canvas) {
            const tempCanvas = cropCanvas(canvas, 0, 0, node.scrollWidth*zoom, node.scrollHeight*zoom)
            let dataUrl = tempCanvas.toDataURL();

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch(function (error) {
            console.error('oops, something went wrong!', error);
        })
        .finally(() => unmarkTextFrames(node));
}