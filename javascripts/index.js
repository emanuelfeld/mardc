var info
var coordinates = {}
var results = {}
var failure_count = 0
var success_count = 0
var locations = []
var index = 0

var output_csv = []
var output_geojson = []

var delay = 500
var markers = []
var map

///////////////
/* LISTENERS */
///////////////

$('#files').bind('change', handleFileSelect)
$('#field_list').bind('change', toggleMAR)
$('#geocode_button').bind('click', runMAR)
$('#failure_button').bind('click', toggleFailure)
$('#gist_button').bind('click', postGist)

///////////////////////
/* MAPPING FUNCTIONS */
///////////////////////

// Initialize map setup
function initialize () {
  var mapOptions = {
    zoom: 2,
    maxZoom: 18,
    center: new google.maps.LatLng(51.505, -0.09)
  }

  map = new google.maps.Map(document.getElementById('map'), mapOptions)
}

// Add a new marker to the markers array
function addMarker (location) {
  var marker = new google.maps.Marker({
    position: location,
    map: map
  })
  markers.push(marker)
}

// Sets the map on all markers in the array.
function setAllMap (map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map)
  }
}

function clearMarkers () {
  setAllMap(null)
}

function deleteMarkers () {
  clearMarkers()
  markers = []
}

initialize()

//////////////////////////
/* FILE HANDLING AND UI */
//////////////////////////

// Take in uploaded file
function handleFileSelect (evt) {
  var files = evt.target.files
  Papa.parse(files[0], {
    header: true,
    complete: function(results) {
      console.log('Uploading file.')
      info = results
      // reset column selection options  
      $('.option').remove()

      makeList()
      toggleMAR()
    }
  })
}

// Make the field dropdowns
function makeList () {
  console.log('Making list.')

  coordinates = {}
  results = {}
  failure_count = 0
  success_count = 0
  locations = []
  index = 0

  $('#field_list').removeAttr('disabled')

  //create options for dropdown, from the uploaded file
  for (var i = 0; i < info.meta.fields.length; i++) {
    var field_option = new Option(info.meta.fields[i], info.meta.fields[i])
    $(field_option).attr('class', 'option')
    $('#field_list').append($(field_option))
  }
}

// Show or hide the MAR failure list
function toggleFailure () {
  if ($('#failure_list').attr('style') === 'display: none') {
    $('#failure_list').attr('style', 'margin-top:10px display: block height:120px width:100% border:none overflow:auto')
    $('#failure_button').text('Hide Failures')
  } else {
    $('#failure_list').attr('style', 'display: none')
    $('#failure_button').text('Show Failures')
  }
}

// Enable or disable run MAR button
function toggleMAR () {
  coordinates = {}
  results = {}

  var geocode_button = $('#geocode_button')
  var selected = $('#field_list option:selected').text()
  if (selected !== 'This Column') {
    geocode_button.removeAttr('disabled')
  } else {
    geocode_button.attr('disabled', 'disabled')
  }
}

//////////////////////
/* DATA ACQUISITION */
//////////////////////

function runMAR () {
  failure_count = 0
  success_count = 0

  deleteMarkers()

  // Reset list of failure_count upon geocoder re-run
  $('#failure_list').text('')
  $('#progress').text('')

  // Enable view failure button
  var failure_button = $('#failure_button')
  failure_button.removeAttr('disabled')

  // Determine location column name
  var selected = $('#field_list option:selected').text()

  locations = info.data.map(function (row) { return row[selected] })

  iterateRows()
}

// Send each row to be queried in MAR
function iterateRows () {
  index = 0

  var begin = function () {
    clearInterval(interval)
    if (index < info.data.length) {
      geocodeRow(index)
      interval = setInterval(begin, delay)
    }
  }

  var interval = setInterval(begin, delay)
}

function cleanAddress (location) {
  return location.toLowerCase().replace(/[ ]/g, '+')
}

function geocodeRow (i) {
  var url = "https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20xml%20WHERE%20url%3D%27http%3A%2F%2Fgeospatial.dcgis.dc.gov%2FwsProxy%2Fproxy_LocVerifier.asmx%2FfindLocation_all%3Fstr%3D" + encodeURIComponent(cleanAddress(locations[i])) + "%27%20AND%20itemPath%3D%27ReturnObject.returnDataset.diffgram.NewDataSet.Table1'&format=json&diagnostics=true&callback="

  $.get(url, function (data) {
    console.log(data)
    var result, lat, lon

    try {
      result = data.query.results.Table1
      success_count++

      // take the first (highest confidence) result if more than one returned
      if (result.length > 0) {
        result = result[0]
      }

      lat = parseFloat(result['LATITUDE'])
      lon = parseFloat(result['LONGITUDE'])

      delete result['LATITUDE']
      delete result['LONGITUDE']

      // add point to markers layer
      var location = new google.maps.LatLng(lat, lon)
      addMarker(location)

      console.log('Status: OK Address: ' + locations[i] + ' Latitude: ' + lat + ', Longitude: ' + lon + ' Delay: ' + delay)
    } catch (e) {
      console.log(e)
      failure_count++

      result = {}

      // Set coordinates to (0, 0) if not found to prevent error in geoJSON
      lat = 0
      lon = 0

      console.log('Status: NOT LOCATED Address: ' + locations[i] + ' Latitude: ' + lat + ', Longitude: ' + lon + ' Delay: ' + delay)
      $('#failure_list').append('Row ' + i + ': ' + locations[i] + '<br>')
    }

    var location_info = {
      'index': i,
      'latitude': lat,
      'longitude': lon,
      'location': locations[i]
    }

    var progress = $('#progress')
    progress.text(success_count + ' of ' + info.data.length + ' found and ' + failure_count + ' failure_count')

    collectPoints(result, location_info)
  })

  index++
}

////////////////////////////////////
/* DATA COLLECTION AND FORMATTING */
////////////////////////////////////

// Gather results and format them for file (csv and geojson) output
function collectPoints (r, a) {
  results[a.index] = r
  coordinates[a.index] = a

  if (Object.keys(coordinates).length === info.data.length) {
    var lat_list = []
    var lon_list = []
    output_csv = []
    output_geojson = []

    for (var i = 0; i < info.data.length; i++) {

      // add non-(0, 0) coordinates to lists to zoom map to points
      if (!(coordinates[i].latitude === 0 & coordinates[i].longitude === 0)) {
        lat_list.push(coordinates[i].latitude)
        lon_list.push(coordinates[i].longitude)
      }

      // combine original file data with returned (non-geocoordinate) MAR data
      var data = jQuery.extend({}, info.data[i], results[i])

      // create object for location, ready for CSV-ification
      output_csv[i] = jQuery.extend({}, data, {
        'latitude': coordinates[i].latitude
      }, {
        'longitude': coordinates[i].longitude
      })

      // create geoJSON feature for location
      output_geojson[i] = jQuery.extend({}, {
        'properties': data
      }, {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [coordinates[i].longitude, coordinates[i].latitude]
        }
      })
    }

    // Zoom to marker extent
    if (lat_list.length > 0) {
      var min_lat = Math.min.apply(Math, lat_list)
      var max_lat = Math.max.apply(Math, lat_list)
      var min_lon = Math.min.apply(Math, lon_list)
      var max_lon = Math.max.apply(Math, lon_list)

      var bounds = new google.maps.LatLngBounds()
      var min_bounds = new google.maps.LatLng(min_lat, min_lon)
      var max_bounds = new google.maps.LatLng(max_lat, max_lon)
      bounds.extend(min_bounds)
      bounds.extend(max_bounds)
      map.fitBounds(bounds)
    }

    // Turn JS object into CSV format
    var csv = Papa.unparse(output_csv)
    // console.log(csv)

    // Wrap geoJSON features in FeatureCollection
    output_geojson = {
      'type': 'FeatureCollection',
      'features': output_geojson
    }

    output_geojson = JSON.stringify(output_geojson, null, '\t')
    // console.log(output_geojson)

    // Enable CSV download link
    var download = $('#download')
    download.removeAttr('disabled')
    download.text('')
    var download_link = $('<a/>')
    download_link.html('CSV')
    download_link.attr({
      'href': 'data:application/csvcharset=utf-8,' + encodeURIComponent(csv),
      'target': '_blank',
      'download': 'dcmar.csv'
    })
    download.append(download_link)

    // Enable geoJSON download link
    var geojson = $('#geojson')
    geojson.removeAttr('disabled')
    geojson.text('')
    var geojson_link = $('<a/>')
    geojson_link.html('GeoJSON')
    geojson_link.attr({
      'href': 'data:text/jsoncharset=utf-8,' + encodeURIComponent(output_geojson),
      'target': '_blank',
      'download': 'dcmar.json'
    })
    geojson.append(geojson_link)

    // Enable geoJSON-to-Gist button for easy map sharing 
    var gist_button = $('#gist_button')
    gist_button.removeAttr('disabled')

  }
}

// Post geoJSON to GitHub Gist
function postGist () {

  var description = 'Map from DC MAR tool on ' + Date.now()

  var data = {
    'description': description,
    'public': true,
    'files': {
      'map.json': {
        'content': output_geojson
      }
    }
  }

  $.post('https://api.github.com/gists', JSON.stringify(data), function (d) {

    var gist_result = $('#gist_result')
    console.log(d.html_url)
    gist_result.attr('href', d.html_url)
    gist_result.text('Map now accessible here')
    console.log(d)
  })

}
