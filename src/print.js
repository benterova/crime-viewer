var jsPDF = require('jspdf');
require('jspdf-autotable');
var _ = require('lodash');
var html2canvas = require('html2canvas');
const $ = require('jquery')

import chroma from 'chroma-js';



import Stats from './stats.js';
import Data from './data.js';

function computeColors() {
    /**
     * @returns {array} - An MapboxGL stops array for symbolizing offense codes
     */
    let colors = {}
    Object.entries(Data.offenses).forEach(([k, v]) => {
        v.forEach(c => {
            colors[c.name] = chroma(c.color).rgb()
        })
    })
    return colors
}

const Print = {

    printView: function (map, data, filter) {
        let pdf = new jsPDF('l', 'px', [612, 792])

        let colors = computeColors()
        console.log(colors)

        console.log(filter)

        pdf.setFontStyle('bold')
        pdf.text(25, 15, "Detroit Crime Viewer Report")
        pdf.setFontSize(10)
        pdf.setFontStyle('italic')
        pdf.text(25, 30, "https://cityofdetroit.github.io/crime-viewer")
        pdf.setFontStyle('bold')
        pdf.text(190, 20, `Showing incidents from ${$('#from_date')[0].value} to ${$('#to_date')[0].value}`)

        if (filter.categories.length === 0) {
            pdf.text(190, 30, `Showing all crime categories`)
        }
        else {
            pdf.text(190, 30, `Showing crime categories: ${filter.categories.join(",")}`)
        }

        if (filter.time.length === 0) {
            pdf.text(190, 40, `Showing all times`)
        }
        else {
            pdf.text(190, 40, `Showing these times: ${filter.time.join(",")}`)
        }

        let mapDiv = document.getElementById('map')
        mapDiv.style.width = '1200px'
        mapDiv.style.height = '720px'
        map.resize()
        map.once('render', m => {
            let summaryStats = Stats.countByKey(data.features, 'properties.offense_category')
            summaryStats = _.omit(summaryStats, "null");
            pdf.addImage(map.getCanvas().toDataURL('image/png'), 190, 50, 600, 360, null, 'FAST')
            mapDiv.style.width = 'calc(100% - 25%)';
            mapDiv.style.height = 'calc(100% - 90px)'
            var columns = ["Offense Category", "Count"];
            var rows = _.sortBy(_.toPairs(summaryStats), function(a) { return a[1] }).reverse()
            pdf.autoTable(columns, rows, {
                tableWidth: 160,
                margin: {
                    top: 50,
                    left: 25
                },
                drawCell: function(cell, data) {
                    if (data.column.dataKey === 0) {
                        let rgb = colors[cell.raw] || [0,0,0]
                        pdf.setFillColor(rgb[0], rgb[1], rgb[2])
                        pdf.circle((cell.x - 10), (cell.y + cell.height/2), 5, 'F')
                        if (data.row.index % 2 === 0) {
                            pdf.setFillColor(245,245,245)
                        }
                        else {
                            pdf.setFillColor(255,255,255)
                        }
                    }
                }
            })
            pdf.save()
        })
    }

}

export default Print;