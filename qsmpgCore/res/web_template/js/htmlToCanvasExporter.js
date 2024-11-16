"use strict";
function save_reports() {
    const start = Date.now();

    var node = document.querySelector('#contentBody');
    const options = {
        'width': node.offsetWidth,
        'height': node.scrollHeight,
    }

    domtoimage.toPng(node, options)
        .then(function (dataUrl) {
            var img = new Image();
            img.src = dataUrl;
            // document.body.appendChild(img);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${previousSelectionElement.id}.png`;
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