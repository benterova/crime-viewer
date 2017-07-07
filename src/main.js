var mapboxgl = require('mapbox-gl');
var moment = require('moment');
var _ = require('lodash');

import Helpers from './helpers.js';
import Socrata from './socrata.js';
import Stats from './stats.js';
import Colors from './colors.js'

mapboxgl.accessToken = 'pk.eyJ1IjoiY2l0eW9mZGV0cm9pdCIsImEiOiJjaXZvOWhnM3QwMTQzMnRtdWhyYnk5dTFyIn0.FZMFi0-hvA60KYnI-KivWg';

// define the map
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center: [-83.091, 42.350],
    zoom: 9
})

// Socrata details
const ds = "9i6z-cm98"
let params = {
  "$where": `incident_timestamp >= '${Helpers.xDaysAgo(14)}'`,
  "$limit": 50000
}

// make the URL
let url = Socrata.makeUrl(ds, params)

// load the map
map.on('load', function() {
  console.log('map is loaded');

  // get the data
  fetch(url).then(r => r.json())
    .then(data => {
      console.log(data);

      // calculate some summary stats
      let incidentsByCategory = Stats.countByKey(data.features, 'properties.offense_category');
      let incidentsByNeighborhood = Stats.countByKey(data.features, 'properties.neighborhood');
      console.log(incidentsByCategory, incidentsByNeighborhood);

      // add the source
      map.addSource('incidents', {
        "type": "geojson",
        "data": data
      });

      // add a layer
      map.addLayer({
        "id": "incidents_point",
        "source": "incidents",
        "type": "circle",
        "layout": {
          "visibility": "visible"
        },
        "paint": {
          "circle-color": {
            property: 'state_offense_code',
            type: 'categorical',
            stops: Colors.crimeStops
          },
          "circle-radius": {
            'base': 1.25,
            'stops': [[8,2.5], [19,9]]
          },
          "circle-opacity": {
            'stops': [[9, 0.5], [19, 1]]
          },
          "circle-stroke-color": 'rgba(255,255,255,1)',
          "circle-stroke-opacity": {
            'stops': [[9, 0.25], [18, 0.75]]
          },
          "circle-stroke-width": {
            'stops': [[9,0.5], [19,3]]
          }
        }

      })

    })
    .catch(e => console.log("Booo"));
})
