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

function save_reports() {
    const start = Date.now();
    let node = null;

    let params = getHashParamsObject();
    const mapName = `${datasetProperties['dataset_name']}${colorNode.value ? "_" : ""}${colorNode.value}`;
    let filename;
    switch (params['mode']) {
        case 'map':
            node = document.getElementById('mapContainer')
            filename = mapName;
            break;

        case 'plots':
            node = document.getElementById('contentRoot');
            filename = params['place'];
            break;

        default:
            node = document.getElementById('mapContainer')
            filename = mapName;
            break;
    }
    
    // add offset to fix bad rendering
    const options = {
        'width': node.scrollWidth + node.offsetLeft, 
        'height': node.scrollHeight + node.offsetTop,
        'windowWidth': node.outerWidth,
        'windowHeight': node.outerHeight,
        'backgroundColor': null,
        'ignoreElements': (element) => {
            return element.classList.contains('capture-ignore');
        },
        'logging': false,
    }

    html2canvas(node, options)
        .then(function (canvas) {
            const tempCanvas = cropCanvas(canvas, 0, 0, node.scrollWidth, node.scrollHeight)
            let dataUrl = tempCanvas.toDataURL();

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            const end = Date.now();
            const executionTime = end - start;
            console.log(`Execution time: ${executionTime} ms`);
        })
        .catch(function (error) {
            console.error('oops, something went wrong!', error);
        });
}