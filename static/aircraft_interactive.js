var downloadingRoute = false;
var activeFeature;

function processedActiveFeature(feature) {
    if (activeFeature != undefined && feature.properties.callsign == activeFeature.properties.callsign) {
        activeAircraftMarker.clearLayers();
        activeFeature = feature;
        activeAircraftMarker.addData(feature);
        return true;
    }
    return false;
}
var activePlaneIcon = L.icon({
    iconUrl: 'static/aiga_air_transportation_orange.svg',
    iconSize: [16, 16]
})

activeAircraftMarker = L.geoJSON(null, {
    onEachFeature: function(feature, layer) {
        var tooltipContent =
            "" + feature.properties.callsign + "<br>" +
            "FL " + feature.properties.flight_level + "<br>" +
            feature.properties.heading + " deg<br>" +
            feature.properties.ground_speed + " kn<br>" +
            feature.properties.vertical_speed + " ft/min";
        layer.bindTooltip(tooltipContent, {
            direction: "top",
            offset: [0, -5]
        });
    },
    pointToLayer: function(feature, latlng) {
        return L.marker(latlng, {
            icon: activePlaneIcon,
            rotationOrigin: 'center center',
            rotationAngle: feature['properties']['heading']
        })
    }
}).addTo(map);

// method that we will use to update the control based on feature properties passed
info.update = function(callsign, props) {
    var text = '<b>' + props.callsign + '</b><br />' +
        props.operator_name + '<br />';
    if (typeof props.flight_number !== 'undefined') {
        if (props.operator_iata === undefined || props.operator_iata == '') {
            text += props.operator_icao + ' ' + props.flight_number + '<br />';
        } else {
            text += props.operator_iata + ' ' + props.flight_number + '<br />';
        }
    }
    for (index = 0; index < props.airports.length; index++) {
        text += props.airports[index].name + ' (' + props.airports[index].icao + ')<br>';
        if (index < props.airports.length - 1) {
            text += ' &ndash; ';
        }
    }
    this._div.innerHTML = '<h4>Route information</h4>' + text;
};

info.unknown = function(callsign) {
    this._div.innerHTML = '<h4>Route information</h4><span style="color: red">' + callsign + ' is unknown</span>';
    routePlot.clearLayers();
};

info.invalid = function(callsign) {
    this._div.innerHTML = '<h4>Route information</h4><span style="color: red">' + callsign + ' is not an airline callsign</span>';
    routePlot.clearLayers();
};

info.reset = function() {
    this._div.innerHTML = '<h4>Route information</h4> Click on any aircraft or airport';
    routePlot.clearLayers();
};

info.addTo(map);

function clickAircraft(eo) {
    // add the previously active feature to the aircraft markers.
    if (typeof activeFeature != 'undefined') {
        aircraftMarkers.addData(activeFeature);
        clusteredAircraftMarkers.clearLayers();
        clusteredAircraftMarkers.addLayer(aircraftMarkers);
    }
    // remember the clicked feature
    activeFeature = eo.target.feature;
    // remove the selected feature from aircraft markers
    eo.target.remove();
    // and clear active marker
    activeAircraftMarker.clearLayers();
    activeAircraftMarker.addData(activeFeature);
    routeInfo(activeFeature.properties.callsign);
}


function clickAirport(eo) {
    // add the previously active feature to the aircraft markers.
    if (typeof activeFeature != 'undefined') {
        aircraftMarkers.addData(activeFeature);
        clusteredAircraftMarkers.clearLayers();
        clusteredAircraftMarkers.addLayer(aircraftMarkers);
    }
    activeFeature = undefined;
    // and clear active marker
    activeAircraftMarker.clearLayers();
    info.reset();
    routesInfo(eo.target.feature.properties);
}

function routeInfo(callsign) {
    if (downloadingRoute == true) {
        return
    };
    downloadingRoute = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', './api/geojson/callsign?callsign=' + callsign);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {
            var route_info = JSON.parse(xhr.responseText);
            if (typeof route_info.features === 'undefined') {
                info.unknown(callsign);
            } else {
                info.update(callsign, route_info.features[0].properties);
                routePlot.clearLayers();
                turf.segmentEach(route_info, function(currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) {
                var start = currentSegment.geometry.coordinates[0];
                var end = currentSegment.geometry.coordinates[1];
                routePlot.addData(turf.greatCircle(start, end));
                });
            }
          } else if (xhr.status === 422) {
              info.invalid(callsign);
          }
        downloadingRoute = false;
    };
    xhr.send();
}

map.on('click', function(eo) {
    // add the previously active feature to the aircraft markers.
    if (typeof activeFeature != 'undefined') {
        aircraftMarkers.addData(activeFeature);
        clusteredAircraftMarkers.clearLayers();
        clusteredAircraftMarkers.addLayer(aircraftMarkers);
    }
    activeFeature = undefined;
    activeAircraftMarker.clearLayers();
    info.reset();
});