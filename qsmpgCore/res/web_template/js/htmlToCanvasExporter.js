function save_reports() {
    const start = Date.now();

    var node = document.querySelector('.content-inner');
    console.log(node.getBoundingClientRect(), 
                [node.clientWidth, node.clientHeight, node.clientTop, node.clientLeft],
                node.getClientRects(),
                [node.offsetWidth, node.offsetHeight, node.offsetTop, node.offsetLeft],
                window.getComputedStyle(node),
                [node.scrollWidth, node.scrollHeight, node.scrollTop, node.scrollLeft],
                [$(node).width(), $(node).height(), $(node).outerWidth(), $(node).outerHeight(), $(node).innerWidth(), , $(node).innerHeight()],
    );
    const options = {
        'width': node.offsetWidth * 1.1,
        'height': node.scrollHeight * 1.1,
        'windowHeight': node.scrollHeight * 1.1,
    }

    // domtoimage.toPng(node, options)
    //     .then(function (dataUrl) {
    //         var img = new Image();
    //         img.src = dataUrl;
    //         document.body.appendChild(img);

    //         const link = document.createElement('a');
    //         link.href = dataUrl;
    //         link.download = `${previousSelectionElement.id}.png`;
    //         document.body.appendChild(link);
    //         link.click();
    //         document.body.removeChild(link);
            
    //         const end = Date.now();
    //         const executionTime = end - start;
    //         console.log(`Execution time: ${executionTime} ms`);
    //     })
    //     .catch(function (error) {
    //         console.error('oops, something went wrong!', error);
    //     });

    html2canvas(node, options).then(canvas => {
        dataUrl = canvas.toDataURL();
        // document.body.appendChild(canvas);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${previousSelectionElement.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        const end = Date.now();
        const executionTime = end - start;
        });
}