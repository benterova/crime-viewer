var mapboxgl = require('mapbox-gl');
var MapboxDraw = require('@mapbox/mapbox-gl-draw');

var turf = require('@turf/turf');

var moment = require('moment');
var _ = require('lodash');
var Slideout = require('slideout');
import chroma from 'chroma-js';

global.jQuery = require('jquery');
require('jq-accordion');
require('jquery.scrollbar');

import Helpers from './helpers.js';
import Socrata from './socrata.js';
import Stats from './stats.js';
import Filter from './filter.js';
import Locate from './locate.js';
import Boundary from './boundary.js';
import Data from './data.js';
import Init from './init.js';

mapboxgl.accessToken = 'pk.eyJ1IjoiY2l0eW9mZGV0cm9pdCIsImEiOiJjaXZvOWhnM3QwMTQzMnRtdWhyYnk5dTFyIn0.FZMFi0-hvA60KYnI-KivWg';

// define the map
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [-83.131, 42.350],
  zoom: 10.75
});

let drawOptions = {
  displayControlsDefault: false
}

var Draw = new MapboxDraw(drawOptions);

map.addControl(Draw)

// load the map
map.on('load', function () {

  console.log(Locate.identifyBounds([-83.0787163063023, 42.351453227480945]))

  // add zoom + geolocate controls
  map.addControl(new mapboxgl.NavigationControl());
  map.addControl(new mapboxgl.GeolocateControl());

  // disable map rotation using right click + drag and touch rotation gesture
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  // get the data
  Socrata.getLatestDate().then(response => {
      const ds = "9i6z-cm98"
      let params = {
        "$limit": 50000,
        "$select": "crime_id,location,address,council_district,neighborhood,precinct,state_offense_code,offense_category,offense_description,report_number,incident_timestamp,day_of_week,hour_of_day"
      };
      params["$where"] = `incident_timestamp >= '${Helpers.xDaysAgo(28, response[0].incident_timestamp)}'`
      let url = Socrata.makeUrl(ds, params);
      console.log(url)

      Socrata.fetchData(url).then(data => {
        console.log(data);

        // calculate some summary stats
        let totalIncidents = Stats.countFeatures(data.features);
        let incidentsByCategory = Stats.countByKey(data.features, 'properties.offense_category');

        // get the earliest and latest incident dates
        let uniqueTimestamps = [...new Set(data['features'].map(item => item.properties['incident_timestamp']))];
        let minTime = _.min(uniqueTimestamps);
        let maxTime = _.max(uniqueTimestamps);

        // count incidents currently viewing
        Stats.printLoadedView(data.features, minTime, maxTime, 'loaded_view');

        // populate an initial chart and table in the Stats tab
        Stats.printAsHighchart(data.features, 'properties.council_district', 'chart-container');
        Stats.printAsTable(incidentsByCategory, 'tbody');

        // load the source data and point, highlight styles
        Init.initialLoad(map, data);

        map.on('mousedown', function (e) {
          var features = map.queryRenderedFeatures(e.point, {
            layers: ['incidents_point']
          });
          if (features.length > 0) {
            console.log(features);
            map.setFilter("incidents_highlighted", ['==', 'crime_id', features[0].properties.crime_id]);
            Stats.printPointDetails(features, 'point_details');
          }
        });

        map.on('mouseenter', 'incidents_point', function (e) {
          map.getCanvas().style.cursor = 'crosshair'
        });

        map.on('mouseout', 'incidents_point', function (e) {
          map.getCanvas().style.cursor = 'pointer'
        });

        document.getElementById('locate').addEventListener('keypress', e => {
          if (e.key == 'Enter') {
            Locate.geocodeAddress(e.target.value).then(result => {
              let coords = result['candidates'][0]['location']
              console.log(Locate.identifyBounds(coords))
              Locate.panToLatLng(result, map)
            });
          }
        });

        // keeping this around for debugging
        document.onkeypress = function (e) {
          console.log(e.keyCode)
          if (e.keyCode == 96) {
            Draw.changeMode('draw_polygon');
            map.setPaintProperty('incidents_point', 'circle-opacity', 0.05)
            map.setPaintProperty('incidents_point', 'circle-stroke-opacity', 0.05)
          }
          if (e.keyCode == 92) {
            console.log(map)
          }
        }

        map.on('draw.create', function (e) {
          Filter.updateData(map, Draw.getAll(), data, Filter.readInput()[0])
          map.setPaintProperty('incidents_point', 'circle-opacity', {'stops': [[9, 0.75],[19, 1]]})
          map.setPaintProperty('incidents_point', 'circle-stroke-opacity', {'stops': [[9, 0.2],[19, 1]]})
        });

        map.on('draw.update', function (e) {
          Filter.updateData(map, Draw.getAll(), data, Filter.readInput()[0])
          // map.setPaintProperty('incidents_point', 'circle-opacity', {'stops': [[9, 0.75],[19, 1]]})
          // map.setPaintProperty('incidents_point', 'circle-stroke-opacity', {'stops': [[9, 0.2],[19, 1]]})
        });

        // swap map boundary and chart axis based on selected area
        jQuery('input[type=radio][name=currentArea]').change(function () {
          Boundary.changeBoundary(map, Boundary.boundaries[this.value])
          Stats.printAsHighchart(data.features, `properties.${this.value}`, 'chart-container');
        });

      })
    })
    .catch(e => console.log("Booo", e));
});

jQuery(document).ready(function () {

  // Populate sidebar
  Init.populateSidebar()

  //responsively adjust height of tab content
  var currentHeight = jQuery('#menu').height() - jQuery('.logo').height() - jQuery('.search').height() - jQuery('.tab-links').height();

  //initiate scrollbar
  jQuery('.scrollbar-macosx').scrollbar();
  jQuery('.scroll-wrapper.tab-content').height(currentHeight - 10);
  jQuery(window).resize(function () {
    currentHeight = jQuery('#menu').height() - jQuery('.logo').height() - jQuery('.search').height() - jQuery('.tab-links').height();
    jQuery('.scroll-wrapper.tab-content').height(currentHeight - 10);
  });

  //Tab Switch Function
  jQuery('.tabs .tab-links a').on('click', function (e) {
    var currentAttrValue = jQuery(this).attr('href');

    // Show/Hide Tabs
    jQuery('.tabs ' + currentAttrValue).fadeIn(400).siblings().hide();

    // Change/remove current tab to active
    jQuery(this).parent('li').addClass('active').siblings().removeClass('active');

    e.preventDefault();
  });

  //initialize accordion
  jQuery('#categories-accordion, #categories-accordion [data-accordion], #time-accordion, #time-accordion [data-accordion]').accordion({
    singleOpen: false,
    autoHeight: false
  });

  jQuery('#area-accordion, #area-accordion [data-accordion]').accordion({
    singleOpen: true,
    autoHeight: false
  });

  //close disclaimer box
  jQuery('.disclaimer-close img').click(function () {
    jQuery('.disclaimer').fadeOut();
  });

  /*initiate slideout
  var slideout = new Slideout({
    'panel': document.getElementById('map'),
    'menu': document.getElementById('menu'),
    'padding': 256,
    'tolerance': 70
  });
  */
});