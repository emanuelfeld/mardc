(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// var mardc = require('mardc');
var coordinates = [];
var lat, lon;
var info;
var field_list;
var field_index = 0;
var failures = 0;
var successes = 0;
var geocoder = new google.maps.Geocoder();
var delay = 300;
var addresses = [];
var output_geojson = [];
var index = 0;
var markers = []


//listen for data upload. right now only csv/tsv type files. also presumes that file contains headers.
document.getElementById('files').addEventListener('change', handleFileSelect, false);
document.getElementById('field_list').addEventListener('change', toggleGeocoder, false);
document.getElementById('list_button').addEventListener('click', makeList, false);
document.getElementById('geocode_button').addEventListener('click', setupGeocoder, false);
document.getElementById('failure_button').addEventListener('click', toggleFailure, false);
document.getElementById('gist_button').addEventListener('click', postGist, false);

//show or hide the geocoding failure list
function toggleFailure() {
	if ($("#failure_list").attr("style") === "display: none;") {
        $("#failure_list").attr("style","margin-top:10px; display: block; height:120px; width:100%; border:none; overflow:auto;");
        $("#failure_button").text("Hide Failures");			    		
	} else {
        $("#failure_list").attr("style","display: none;");
        $("#failure_button").text("Show Failures");			    					    		
	}
}

var map;

function initialize() {
  var mapOptions = {
    zoom: 2,
    maxZoom: 18,
    center: new google.maps.LatLng(51.505, -0.09)
  };
  map = new google.maps.Map(document.getElementById('map'),
      mapOptions);
}

function addMarker(location) {
  var marker = new google.maps.Marker({
    position: location,
    map: map
  });
  markers.push(marker);
}

// Sets the map on all markers in the array.
function setAllMap(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

function clearMarkers() {
  setAllMap(null);
}

function deleteMarkers() {
  clearMarkers();
  markers = [];
}

initialize();

//take in uploaded file
function handleFileSelect(evt) {
	var files = evt.target.files;
	var parsed = Papa.parse(files[0], {
		header: true,
		complete: function(results) {
			info = results;
			var list_button = document.getElementById("list_button");
			list_button.removeAttribute("disabled");

			coordinates = [];
			field_index = 0;
			failures = 0;
			successes = 0;
		    delay = 300;
			addresses = [];
			index = 0;

			//reset column choice section
			field_index = 0; 
			$(".option").remove();
			$(".additional").remove();

			console.log("Uploading file.")
			console.log(info);
			
			makeList();
		}
	});
}

//make the field dropdowns
function makeList() {
	console.log("Making list.");

	coordinates = [];
	failures = 0;
	successes = 0;
    delay = 300;
	addresses = [];
	index = 0;

	//check if this is the first dropdown or another, and set things up accordingly
	var list_number = document.createAttribute("list_number");
	if (field_index === 0) {
		field_list = document.getElementById('field_list');
		field_list.removeAttribute("disabled");
		field_list.setAttribute("list_number",field_index);
	} else {
		//create div for 'additional' dropdown
		var list_div = document.createElement('div');
		list_div.setAttribute("class", "additional");

		//create dropdown select
		field_list = document.createElement('select');
		field_list.setAttribute("class","field_list");
		field_list.setAttribute("list_number",field_index);

		//put option placeholder 'and this column' to await selection
		var list_placeholder = document.createElement('option');
		list_placeholder.selected = "selected";
		list_placeholder.textContent = "And This Column";

		//container
		var column_select = document.getElementById("column_select");

		//put it all together
		field_list.appendChild(list_placeholder);
		column_select.appendChild(list_div);
		list_div.appendChild(field_list);
	}

	//create options for dropdown, from the uploaded file
	for (var i = 0; i < info.meta.fields.length; i++) {
		var field_option = new Option();
		field_option.setAttribute("class", "option");
		field_option.value = info.meta.fields[i];
		field_option.text = info.meta.fields[i];
		field_list.options.add(field_option);
	}

	//increment number of dropdowns
	field_index++;
}

//enable or disable run geocoder button
function toggleGeocoder() {
	var geocode_button = document.getElementById('geocode_button');
	var selected = document.getElementById('field_list').selectedOptions[0].text;
	if (selected != "This Column") {
		geocode_button.removeAttribute("disabled");
	} else {
		geocode_button.setAttribute("disabled", "disabled");
	}
}

function setupGeocoder() {
	failures = 0;
	successes = 0;
	// markers.clearLayers();
	deleteMarkers();

	//reset list of failures upon geocoder re-run
	$("#failure_list").text("");	
	$("#progress").text("");

	//enable view failure button
	var failure_button = document.getElementById('failure_button');
	failure_button.removeAttribute('disabled');

	var selected_fields = [];
	var field_lists = document.getElementsByClassName('field_list');

	//determine which options have been selected across all dropdowns
	[].forEach.call(field_lists, function (list) {
		var selected_field = list.selectedOptions[0].text;
		if (selected_field !== 'And This Column') {
			selected_fields.push(selected_field);
		}
	});

	gatherAddresses(selected_fields);
}

function gatherAddresses(s) {
	addresses = [];

	for (var i=0; i < info.data.length; i++) {
		//combine selected options to create full address string
		var address = [];
		[].forEach.call(s, function (x) {
			address.push(info.data[i][x]);
		});
		address = address.join(" ");						
		addresses.push(address);
	}

	iterateRows();
}


//geocode each row
function iterateRows() {

	index = 0;

	var begin = function() {
		clearInterval(interval);
		if (index < info.data.length) {
			geocodeRow(index);
			interval = setInterval(begin, delay);
		}
	}
	var interval = setInterval(begin, delay);
}

var addressCallback = function() {
	console.log(this.responseText);
};

function httpGet(url, addressCallback) {
	 var req = new XMLHttpRequest();
	 req.addEventListener("load", addressCallback, false);
	 req.open('GET', url);
	 req.send(null);
}			


function geocodeRow(i) {
	console.log(addresses[i]);
	url = "https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20xml%20WHERE%20url%3D'http%3A%2F%2Fgeospatial.dcgis.dc.gov%2FwsProxy%2Fproxy_LocVerifier.asmx%2FfindLocation_all%3Fstr%3D" + encodeURIComponent(address[i]) + "'%20AND%20itemPath%3D'ReturnObject.returnDataset.diffgram.NewDataSet.Table1'&diagnostics=true"
	index++;
	// mardc(addresses[i], function(error, data) {
	// 	if (data) {
	// 		lat = parseFloat(data.results[0]['LATITUDE']);
	// 		lon = parseFloat(data.results[0]['LONGITUDE']);
	// 		index++;
	// 		console.log("Status: OK; Address: " + addresses[i] + "; Latitude: " + lat + ", Longitude: " + lon + "; Delay: " + delay);
	// 		successes++;
	// 		var location = new google.maps.LatLng(lat, lon);
	// 		addMarker(location);
	// 	} else {
	// 		lat = 0;
	// 		lon = 0;
	// 		index++;
	// 		console.log("Status: NOT LOCATED; Address: " + addresses[i] + "; Latitude: " + lat + ", Longitude: " + lon + "; Delay: " + delay);
	// 		failures++;							
	// 	}
	// 	var progress = document.getElementById('progress');
	// 	progress.textContent = successes + " of " + info.data.length + " geocoded and " + failures + " failures";

	// 	collectPoints(address_info);
	// });
}

//gather results and format them for file (csv and geojson) output
function collectPoints(a) {
	console.log(a);
	if (a.index === 0) {
		coordinate_list = [];
	}

	coordinate_list.push(a);

	if (coordinate_list.length === info.data.length) {
		var lat_list = [];
		var lon_list = [];
		var output_csv = [];
		output_geojson = [];
		for (var i = 0; i < info.data.length; i++) {
			if (!(coordinate_list[i].latitude === 0 & coordinate_list[i].longitude === 0)) {
				lat_list.push(coordinate_list[i].latitude);
				lon_list.push(coordinate_list[i].longitude);								
			};
			output_csv[i] = jQuery.extend({}, info.data[i], {
				'latitude': coordinate_list[i].latitude
			}, {
				'longitude': coordinate_list[i].longitude
			});
			output_geojson[i] = jQuery.extend({}, {
				'properties': info.data[i]
			}, {
				'type': 'Feature',
				'geometry': {
					'type': 'Point',
					'coordinates': [coordinate_list[i].longitude, coordinate_list[i].latitude]
				}
			});
		}

			// 'crs': {'type': 'EPSG', 'properties': {'code': 4326}},

		output_geojson = {
			'type': 'FeatureCollection',
			'features': output_geojson
		};
		output_geojson = JSON.stringify(output_geojson, null, '\t');

		console.log(output_geojson);

		if (lat_list.length > 0) {
			min_lat = Math.min.apply(Math, lat_list);
			max_lat = Math.max.apply(Math, lat_list);
			min_lon = Math.min.apply(Math, lon_list);
			max_lon = Math.max.apply(Math, lon_list);

			var bounds = new google.maps.LatLngBounds();
			var min_bounds = new google.maps.LatLng(min_lat,min_lon);
			var max_bounds = new google.maps.LatLng(max_lat,max_lon);
			bounds.extend(min_bounds);
			bounds.extend(max_bounds);
			map.fitBounds(bounds);
			// map.fitBounds([
			// 	[min_lat, min_lon],
			// 	[max_lat, max_lon]
			// ]);							
		}

		var csv = Papa.unparse(output_csv);

		console.log(csv);

		var geojson = document.getElementById('geojson');
		geojson.removeAttribute("disabled");
		geojson.textContent = "";
		var geojson_link = document.createElement('a');
		geojson_link.innerHTML = "GeoJSON";
		geojson_link.href = "data:text/json;charset=utf-8," + encodeURIComponent(output_geojson);
		geojson_link.target = '_blank';
		geojson_link.download = "geojson.json";
		geojson.appendChild(geojson_link);


		var download = document.getElementById('download');
		download.removeAttribute("disabled");
		download.textContent = "";
		var download_link = document.createElement('a');
		download_link.innerHTML = "CSV";
		download_link.href = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);
		download_link.target = '_blank';
		download_link.download = 'geocoded.csv';
		download.appendChild(download_link);

		var gist_button = document.getElementById("gist_button");
		gist_button.removeAttribute("disabled");

	}
}

function postGist() {

	var description = "Map from geocode on " + Date.now();
	var filename = "map" + Date.now() + ".json";

	var data = {
	  "description": description,
	  "public": true,
	  "files": {
	    "map.json": {
	      "content": output_geojson
	    }
	  }
	}

  $.post('https://api.github.com/gists', JSON.stringify(data), function(d) {

  	var gist_result = document.getElementById("gist_result");
  	console.log(d.html_url);
  	gist_result.setAttribute("href", d.html_url);
  	gist_result.textContent = "Map now accessible here";
  	console.log(d);
  });

}


},{}]},{},[1]);
