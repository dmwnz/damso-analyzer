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
                id: 'power-y-axis',
                ticks: {
                    beginAtZero: true
                },
                position: 'left'
            },{
                id: 'cadence-y-axis',
                ticks: {
                    beginAtZero: true
                },
                position: 'right'
            }],
            xAxes: [{
                type: 'time'
            }]
        },
        tooltips: {
            mode: 'index',
            intersect: false
        }
    }
});
var i = 0;
var backgroundColors = ['rgba(100, 0, 0, 0.1)', 'rgba(0, 100, 0, 0.1)', 'rgba(0, 0, 100, 0.1)', 'rgba(100, 100, 0, 0.1)', 'rgba(100, 0, 100, 0.1)']
var borderColors     = ['rgba(100, 0, 0, 0.5)', 'rgba(0, 100, 0, 0.5)', 'rgba(0, 0, 100, 0.5)', 'rgba(100, 100, 0, 0.5)', 'rgba(100, 0, 100, 0.5)']

var sliderDatetimeDiv = document.getElementById('slider-datetime');
var sliderCadenceDiv = document.getElementById('slider-cadence');
var sliderPowerDiv = document.getElementById('slider-power');

var date1 = new Date();
var date2 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate(), date1.getHours() + 1);

var fullDataSets = [];

var slider_datetime = noUiSlider.create(sliderDatetimeDiv, {
    start: [date1.getTime(), date2.getTime()],
    connect: true,
    range: {
        'min': date1.getTime(),
        'max': date2.getTime()
    }
});

var slider_cadence = noUiSlider.create(sliderCadenceDiv, {
    start: [0, 100],
    connect: true,
    tooltips: [true, true],
    range: {
        'min': 0,
        'max': 100
    }
});

var slider_power = noUiSlider.create(sliderPowerDiv, {
    start: [0, 1000],
    connect: true,
    tooltips: [true, true],
    range: {
        'min': 0,
        'max': 1000
    }
});

slider_datetime.on('update', function(values) {
    var begin = new Date(parseInt(values[0]))
    var end = new Date(parseInt(values[1]))

    chart.options.scales.xAxes[0].ticks.min = begin
    chart.options.scales.xAxes[0].ticks.max = end

    updateAveragePower()

});

slider_cadence.on('update', function() {
    filterDataSet()
    updateAveragePower()
});

slider_power.on('update', function(values) {
    filterDataSet()
    updateAveragePower()
});

function filterDataSet() {

    var cadence_min = parseInt(slider_cadence.get()[0])
    var cadence_max = parseInt(slider_cadence.get()[1])

    var power_min = parseInt(slider_power.get()[0])
    var power_max = parseInt(slider_power.get()[1])

    var pointsToRemove = []
    chart.data.datasets.forEach((ds, i) => {
        if(ds.label.startsWith('cad')) {
            fullDataSets[i].forEach(d => {
                if(d.y < cadence_min || d.y > cadence_max) {
                    pointsToRemove.push(Math.round(d.t.getTime()/1000))
                }
            })
        }
        if(ds.label.startsWith('pow')) {
            fullDataSets[i].forEach(d => {
                if(d.y < power_min && d.y <= power_max) {
                    pointsToRemove.push(Math.round(d.t.getTime()/1000))
                }
            })
        }
    })
    chart.data.datasets.forEach((ds,i) => {
        ds.data = fullDataSets[i].filter(d => !pointsToRemove.includes(Math.round(d.t.getTime()/1000)))
    })

}


function updateAveragePower() {
    var begin = new Date(parseInt(slider_datetime.get()[0]))
    var end = new Date(parseInt(slider_datetime.get()[1]))

    chart.data.datasets.forEach((ds, idx) => {
        if(ds.label.startsWith('avg') && chart.data.datasets[idx-1].data.length > 0) {
            var averaged_data = getAveragedData(chart.data.datasets[idx-1].data, begin, end)
            ds.data = averaged_data
            ds.label = ds.label.split('(')[0] + '(' + averaged_data[0].y + ')'
        }
    });

    chart.update()
}

function getAveragedData(data, begin, end) {
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

    var res = [{
        t: data[0].t,
        y: average
    },{
        t: data[data.length - 1].t,
        y: average
    }]
    return res
}


function buildChart(filename, fit_data, offset) {
    var chartPowerData = fit_data.records
        .map(a => {
            a.timestamp.setHours( a.timestamp.getHours() + offset )
            return { t: a.timestamp, y: a.power }
        })
        .filter(a => a.y != undefined)

    fullDataSets.push(chartPowerData)
    chart.data.datasets.push({
        label: 'pow_' + filename,
        data:  chartPowerData,
        backgroundColor: backgroundColors[i],
        borderColor: backgroundColors[i],
        borderWidth: 1,
        pointRadius: 0,
        yAxisID: 'power-y-axis',
        lineTension: 0
    });

    var averaged_data = getAveragedData(chartPowerData)
    fullDataSets.push(averaged_data)
    chart.data.datasets.push({
        label: 'avg_pow_' + filename + ' (' + averaged_data[0].y + ')' ,
        data:  averaged_data,
        borderColor: borderColors[i],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        yAxisID: 'power-y-axis',
        lineTension: 0
    });

    var chartCadenceData = fit_data.records
        .map(a => {
            return { t: a.timestamp, y: a.cadence }
        })
        .filter(a => a.y != undefined && a.y != 0)
    
    if(chartCadenceData.length > 2) {
        fullDataSets.push(chartCadenceData)
        chart.data.datasets.push({
            label: 'cad_' + filename,
            data:  chartCadenceData,
            borderColor: borderColors[i],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            yAxisID: 'cadence-y-axis',
            lineTension: 0
        });
    }
    
    var data_min_datetime = chartPowerData[0].t.getTime()
    var data_max_datetime = chartPowerData[chartPowerData.length - 1].t.getTime()
    
    var data_min_cadence = Math.min.apply(Math, chartCadenceData.map(d => d.y))
    var data_max_cadence = Math.max.apply(Math, chartCadenceData.map(d => d.y))

    var data_min_power = Math.min.apply(Math, chartPowerData.map(d => d.y))
    var data_max_power = Math.max.apply(Math, chartPowerData.map(d => d.y))

    if (i != 0) {
        var slider_datetime_min = parseInt(slider_datetime.get()[0])
        var slider_datetime_max = parseInt(slider_datetime.get()[1])

        var slider_cadence_min  = parseInt(slider_cadence.get()[0])
        var slider_cadence_max  = parseInt(slider_cadence.get()[1])

        var slider_power_min    = parseInt(slider_power.get()[0])
        var slider_power_max    = parseInt(slider_power.get()[1])

        data_min_datetime = Math.min(data_min_datetime, slider_datetime_min)
        data_max_datetime = Math.max(data_max_datetime, slider_datetime_max)

        data_min_cadence = Math.min(data_min_cadence, slider_cadence_min)
        data_max_cadence = Math.max(data_max_cadence, slider_cadence_max)

        data_min_power = Math.min(data_min_power, slider_power_min)
        data_max_power = Math.max(data_max_power, slider_power_max)
    }

    slider_datetime.updateOptions({
        range: {
            'min': data_min_datetime,
            'max': data_max_datetime
        }
    });
    
    if(chartCadenceData.length > 2) {
        slider_cadence.updateOptions({
            range: {
                'min': data_min_cadence,
                'max': data_max_cadence
            }
        });
    }
    slider_power.updateOptions({
        range: {
            'min': data_min_power,
            'max': data_max_power
        }
    });

    slider_datetime.set([data_min_datetime, data_max_datetime]);
    if(chartCadenceData.length > 2) {
        slider_cadence.set([data_min_cadence, data_max_cadence]);
    }
    slider_power.set([data_min_power, data_max_power]); 

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

                var offset = prompt("Time zone offet? (hours)", "0")
                offset = parseInt(offset)

                buildChart(file.name, data, offset)
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