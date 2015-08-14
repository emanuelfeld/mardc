var coordinates = [];
var coordinate_list = {};
var result_list = {};
var lat, lon;
var info;
var field_list;
var field_index = 0;
var failures = 0;
var successes = 0;
var geocoder = new google.maps.Geocoder();
var delay = 500;
var addresses = [];
var output_geojson = [];
var index = 0;
var markers = []


//listen for data upload. right now only csv/tsv type files. also presumes that file contains headers.
$('#files').bind("change", handleFileSelect);
$('#field_list').bind("change", toggleGeocoder);
$('#list_button').bind("click", makeList);
$('#geocode_button').bind("click", setupGeocoder);
$('#failure_button').bind("click", toggleFailure);
$('#gist_button').bind("click", postGist);

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

// Initialize map setup
function initialize() {
  var mapOptions = {
    zoom: 2,
    maxZoom: 18,
    center: new google.maps.LatLng(51.505, -0.09)
  };
  map = new google.maps.Map(document.getElementById('map'), mapOptions);
}

// Add a new marker to the markers array
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

// Take in uploaded file
function handleFileSelect(evt) {
	var files = evt.target.files;
	var parsed = Papa.parse(files[0], {
		header: true,
		complete: function(results) {
			info = results;
			var list_button = $("#list_button");
			list_button.removeAttr("disabled");

			coordinates = [];
			field_index = 0;
			failures = 0;
			successes = 0;
		    delay = 500;
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
	coordinate_list = {};
	result_list = {};
	failures = 0;
	successes = 0;
    delay = 500;
	addresses = [];
	index = 0;

	//check if this is the first dropdown or another, and set things up accordingly
	if (field_index === 0) {
		field_list = $('#field_list');
		field_list.removeAttr("disabled");
		field_list.attr("list_number",field_index);
	} else {
		//create div for 'additional' dropdown
		var list_div = $('<div/>');
		list_div.attr("class", "additional");

		//create dropdown select
		field_list = $('<select/>');
		field_list.attr({
			"class":"field_list",
			"id":"field_list",
			"list_number":field_index
		});

		//put option placeholder 'and this column' to await selection
		var list_placeholder = $('<option/>');
		list_placeholder.selected = "selected";
		list_placeholder.text("And This Column");

		//container
		var column_select = $("#column_select");

		//put it all together
		field_list.append(list_placeholder);
		column_select.append(list_div);
		list_div.append(field_list);
	}

	//create options for dropdown, from the uploaded file
	for (var i = 0; i < info.meta.fields.length; i++) {
		var field_option = new Option(info.meta.fields[i], info.meta.fields[i]);
		$(field_option).attr("class", "option");
		field_list.append($(field_option));
	}

	//increment number of dropdowns
	field_index++;
}

//enable or disable run geocoder button
function toggleGeocoder() {
	var geocode_button = $('#geocode_button');
	var selected = $('#field_list option:selected').text();
	if (selected != "This Column") {
		geocode_button.removeAttr("disabled");
	} else {
		geocode_button.attr("disabled", "disabled");
	}
}

function setupGeocoder() {
	failures = 0;
	successes = 0;

	deleteMarkers();

	//reset list of failures upon geocoder re-run
	$("#failure_list").text("");
	$("#progress").text("");

	//enable view failure button
	var failure_button = $('#failure_button');
	failure_button.removeAttr('disabled');

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

function cleanAddress(address) {
	address = address.toLowerCase().replace(/[ ]/g,"+");
	return address;
}

function geocodeRow(i) {
	url = "https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20xml%20WHERE%20url%3D%27http%3A%2F%2Fgeospatial.dcgis.dc.gov%2FwsProxy%2Fproxy_LocVerifier.asmx%2FfindLocation_all%3Fstr%3D" + encodeURIComponent(cleanAddress(addresses[i])) + "%27%20AND%20itemPath%3D%27ReturnObject.returnDataset.diffgram.NewDataSet.Table1'&format=json&diagnostics=true&callback=";
	$.get(url, function(data) {
		console.log(data);
		var result;
		try {
			result = data.query.results.Table1;
			successes++;
			if (result.length > 0) {
				result = result[0];
			}
			lat = parseFloat(result['LATITUDE']);
			lon = parseFloat(result['LONGITUDE']);
			delete result['LATITUDE'];
			delete result['LONGITUDE'];
			var location = new google.maps.LatLng(lat, lon);
			addMarker(location);
			console.log("Status: OK; Address: " + addresses[i] + "; Latitude: " + lat + ", Longitude: " + lon + "; Delay: " + delay);
		} catch (e) {
			console.log(e);
			failures++;
			result = {};
			lat = 0;
			lon = 0;
			console.log("Status: NOT LOCATED; Address: " + addresses[i] + "; Latitude: " + lat + ", Longitude: " + lon + "; Delay: " + delay);
			$("#failure_list").append("Row " + i +": " + addresses[i] + "<br>");
		}
		var address_info = {
			'index': i,
			'latitude': lat,
			'longitude': lon,
			'address': addresses[i]
		};
		var progress = $('#progress');
		progress.text(successes + " of " + info.data.length + " found and " + failures + " failures");
		collectPoints(result, address_info);
	});
	index++;
}

//gather results and format them for file (csv and geojson) output
function collectPoints(r, a) {
	console.log(r)
	console.log(a)
	result_list[a.index] = r;
	coordinate_list[a.index] = a;
	
	if (Object.keys(coordinate_list).length === info.data.length) {
		var lat_list = [];
		var lon_list = [];
		var output_csv = [];
		output_geojson = [];
		for (var i = 0; i < info.data.length; i++) {
			if (!(coordinate_list[i].latitude === 0 & coordinate_list[i].longitude === 0)) {
				lat_list.push(coordinate_list[i].latitude);
				lon_list.push(coordinate_list[i].longitude);								
			};
			data = jQuery.extend({}, info.data[i], result_list[i]);
			output_csv[i] = jQuery.extend({}, data, {
				'latitude': coordinate_list[i].latitude
			}, {
				'longitude': coordinate_list[i].longitude
			});
			output_geojson[i] = jQuery.extend({}, {
				'properties': data
			}, {
				'type': 'Feature',
				'geometry': {
					'type': 'Point',
					'coordinates': [coordinate_list[i].longitude, coordinate_list[i].latitude]
				}
			});
		}

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
		}

		var csv = Papa.unparse(output_csv);

		console.log(csv);

		var geojson = $('#geojson');
		geojson.removeAttr('disabled');
		geojson.text('');
		var geojson_link = $('<a/>');
		geojson_link.html("GeoJSON");
		geojson_link.attr({
			'href': 'data:text/json;charset=utf-8,' + encodeURIComponent(output_geojson),
			'target': '_blank',
			'download': 'geojson.json'
		});
		geojson.append(geojson_link);


		var download = $('#download');
		download.removeAttr('disabled');
		download.text('');
		var download_link = $('<a/>');
		download_link.html("CSV");
		download_link.attr({
			'href': 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv),
			'target': '_blank',
			'download': 'geocoded.csv'
		});
		download.append(download_link);

		var gist_button = $("#gist_button");
		gist_button.removeAttr("disabled");

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

  	var gist_result = $("#gist_result");
  	console.log(d.html_url);
  	gist_result.attr('href', d.html_url);
  	gist_result.text("Map now accessible here");
  	console.log(d);
  });

}

