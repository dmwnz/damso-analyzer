// import { EasyFit } from "./easy-fit/dist/easy-fit.js";

import { default as FitParser } from "./fit-parser-1.8.4/dist/fit-parser.js"

const inputElement = document.getElementById("inputElement")

// get the value once
inputElement.files[0]

// get the value every time the user selects a new file
inputElement.addEventListener("change", (e) => {
    // e.target points to the input element
    var selectedFile = e.target.files[0]
    readFit(selectedFile)
})

var ctx = document.getElementById('myChart');
var chart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: []
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }],
            xAxes: [{
                type: 'time'
            }]
        },
        tooltips: {
            mode: 'index',
            intersect: false
         },
         hover: {
            mode: 'index',
            intersect: false
         }
    }
});
var i = 0;
var backgroundColors = ['rgba(100, 0, 0, 0.1)', 'rgba(0, 100, 0, 0.1)', 'rgba(0, 0, 100, 0.1)', 'rgba(100, 100, 0, 0.1)', 'rgba(100, 0, 100, 0.1)']
var borderColors     = ['rgba(100, 0, 0, 0.5)', 'rgba(0, 100, 0, 0.5)', 'rgba(0, 0, 100, 0.5)', 'rgba(100, 100, 0, 0.5)', 'rgba(100, 0, 100, 0.5)']

var sliderDiv = document.getElementById('slider');

var date1 = new Date();
var date2 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate(), date1.getHours() + 1);

var slider = noUiSlider.create(sliderDiv, {
    start: [date1.getTime(), date2.getTime()],
    connect: true,
    range: {
        'min': date1.getTime(),
        'max': date2.getTime()
    }
});

slider.on('update', function(values) {
    var begin = new Date(parseInt(values[0]))
    var end = new Date(parseInt(values[1]))

    chart.options.scales.xAxes[0].ticks.min = begin
    chart.options.scales.xAxes[0].ticks.max = end

    chart.data.datasets.forEach((ds, idx) => {
        if(ds.label.startsWith('avg')) {
            ds.data = getAveragedData(chart.data.datasets[idx-1].data, begin, end)
        }
    });

    chart.update()

});

function getAveragedData(data, begin=null, end=null) {
    var sum = 0
    var n = 0
    data.forEach(d => {
        if(begin == null || d.t >= begin) {
            if(end == null || d.t <= end) {
                sum += parseInt(d.y)
                n++
            }
        }
    })
    var average = Math.round(sum * 10 / n) / 10
    return data.map(a => { return {t: a.t, y: average}})
}


function buildChart(filename, fit_data) {
    var chartData = fit_data.records
        .map(a => {
            if(a.left_right_balance == undefined) {
                a.timestamp.setHours( a.timestamp.getHours() - 2 )
            }
            return { t: a.timestamp, y: a.power }
        })
        .filter(a => a.y != undefined)

    chart.data.datasets.push({
        label: filename,
        data:  chartData,
        backgroundColor: backgroundColors[i],
        borderColor: backgroundColors[i],
        borderWidth: 1,
        pointRadius: 0
    });

    chart.data.datasets.push({
        label: 'avg' + filename,
        data:  getAveragedData(chartData),
        backgroundColor: backgroundColors[i],
        borderColor: borderColors[i],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
    });

    var data_min = chartData[0].t.getTime()
    var data_max = chartData[chartData.length - 1].t.getTime()
    
    if (i != 0) {
        var slider_min = parseInt(slider.get()[0])
        var slider_max = parseInt(slider.get()[1])

        data_min = Math.min(data_min, slider_min)
        data_max = Math.max(data_max, slider_max)
    }

    slider.updateOptions({
        range: {
            'min': data_min,
            'max': data_max
        }
    });
    slider.set([data_min, data_max]);

    i++;

    chart.update();

}

function readFit(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
        // e.target points to the reader
        const textContent = e.target.result
        console.log(`The content of ${file.name}`)

        easyFit.parse(textContent, function (error, data) {

            if (error) {
                console.log(error);
            } else {
                console.log("Data loaded")

                buildChart(file.name, data)
            }
    
        });
    }
    reader.onerror = (e) => {
        const error = e.target.error
        console.error(`Error occured while reading ${file.name}`, error)
    }
    reader.readAsArrayBuffer(file)

    var easyFit = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'kelvin',
        elapsedRecordField: true,
        mode: 'list'
    });
    
}