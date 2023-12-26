function getOptions(columnNames) {
    let options = {
        axis: {
            x: {
                type: 'category',
                categories: columnNames,
                min: .5,
                label: {
                    text: 'Time',
                    position: 'outer-right',
                },
                tick: {
                    rotate: -35,
                    multiline: false
                },
            },
            y: {
                // max: 400,
                min: 0,
                label: {
                    text: 'Rainfall (mm)',
                    position: 'outer-top',
                },
                padding: {
                    // top:0,
                    bottom: 0
                },
            },
            // y2: {
            //     show: true,
            // },
        },
        grid: {
            x: {
                show: true,
                // lines: [
                //     {value: 4.5, text: 'Lable 4.5', position: 'start'},
                // ]
            },
            y: {
                show: true
            }
        },
        legend: {
            show: true,
            usePoint: true
            // position: 'right'
        },
        point: {
            show: false,
            pattern: [
                'circle',
                'rectangle',
            ]
        },
        transition: {
            duration: false,
        },
    }
    return options;
}

function makeBillboard(data, columnNames, container) {
    let containerWidth = parseInt(d3.select(container).style('width'), 10);
    options = getOptions(columnNames);
    let bbplot = bb.generate({
        bindto: container,
        data: {
            json: data[firstPlaceKey],
            // regions: {
            //     '1981': [{ style: { dasharray: "6 2" } }]
            // }
        },
        // line: {
        //   classes: [
        //     "line-class-data1",
        //     "line-class-data2"
        //   ]
        // },
        size: {
            width: containerWidth,
            height: containerWidth * (9 / 16)
        },
        ...options
    });

    window.addEventListener('resize', function () {
        let containerWidth = parseInt(d3.select(container).style('width'), 10);
        bbplot.resize({ width: containerWidth, height: containerWidth * (9 / 16) });
    });
    
    return bbplot;
}

function updateBillboard(index, data, bbPlot) {
    bbPlot.load({
        json: data[index],
    });
}