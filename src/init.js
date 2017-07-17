import Data from './data.js';
import Boundary from './boundary.js';

function computeColors() {
    /**
     * @returns {array} - An MapboxGL stops array for symbolizing offense codes
     */
    let colors = []
    Object.entries(Data.offenses).forEach(([k, v]) => {
        v.forEach(c => {
            c.state_codes.forEach(o => {
                colors.push([o, c.color])
            })
        })
    })
    return colors
}

const Init = {
    /**
     * Adds a new Mapbox GL source and two styles to the map.
     * @param {map} - a mapboxgl.Map instance
     * @param {obj} - a GeoJSON to be displayed on the map
     * @returns {undefined}
     */
    initialLoad: function (map, data) {
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
                    stops: computeColors()
                },
                "circle-radius": {
                    'base': 1.25,
                    'stops': [
                        [8, 2.5],
                        [19, 9]
                    ]
                },
                "circle-opacity": {
                    'stops': [
                        [9, 0.5],
                        [19, 1]
                    ]
                },
                "circle-stroke-color": 'rgba(255,255,255,1)',
                "circle-stroke-opacity": {
                    'stops': [
                        [9, 0.25],
                        [18, 0.75]
                    ]
                },
                "circle-stroke-width": {
                    'stops': [
                        [9, 0.5],
                        [19, 3]
                    ]
                }
            }
        })
        map.addLayer({
            "id": "incidents_highlighted",
            "source": "incidents",
            "type": "circle",
            "layout": {
                "visibility": "visible"
            },
            "paint": {
                "circle-color": {
                    property: 'state_offense_code',
                    type: 'categorical',
                    stops: computeColors()
                },
                "circle-radius": {
                    'base': 1.25,
                    'stops': [
                        [8, 2.5],
                        [19, 9]
                    ]
                },
                "circle-opacity": {
                    'stops': [
                        [9, 0.5],
                        [19, 1]
                    ]
                },
                "circle-stroke-color": 'rgba(0,0,0,1)',
                "circle-stroke-opacity": {
                    'stops': [
                        [9, 0.25],
                        [18, 0.75]
                    ]
                },
                "circle-stroke-width": {
                    'stops': [
                        [9, 2.5],
                        [19, 8]
                    ]
                }
            }
        })
        // set a filter on highlighted which won't match anything
        map.setFilter('incidents_highlighted', ["==", "crime_id", "NONE"])

        // add the boundary
        Boundary.addBoundary(map, Boundary.boundaries.council_district);

    }
}

export default Init;