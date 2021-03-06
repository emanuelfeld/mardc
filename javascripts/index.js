'use strict';

(function () {
  var App = function (map) {
    this.mapOptions = {
      zoom: 12,
      maxZoom: 18,
      center: new google.maps.LatLng(38.8993488, -77.0145665)
    }

    this.map = new google.maps.Map(document.getElementById('map'), this.mapOptions)
    this.markers = []

    this.geocoder = new Geocoder(this, this.map)
    this.rowCount = 0
    this.failureCount = 0
    this.successCount = 0
    this.processedCount = 0

    this.uploadButton = $('#uploadButton')
    this.fieldMenu = $('#fieldMenu')
    this.geocodeButton = $('#geocodeButton')
    this.failureButton = $('#failureButton')
    this.csvButton = $('#csvButton')
    this.geojsonButton = $('#geojsonButton')
    this.gistButton = $('#gistButton')
    this.failures = $('#failures')
    this.progress = $('#progress')
  }

  App.prototype = {
    reset: function () {
      this.failureCount = 0
      this.successCount = 0
      this.processedCount = 0

      this.failures.text('')
      this.progress.text('')
      this.clearMarkers()

      this.geocoder.reset()

      $('#gistResult').text('')
      this.gistButton.removeClass('hidden')
      this.gistButton.attr('disabled', 'disabled')
      this.csvButton.attr('disabled', 'disabled')
      this.csvButton.text('CSV')
      this.geojsonButton.attr('disabled', 'disabled')
      this.geojsonButton.text('GeoJSON')
      this.failureButton.attr('disabled', 'disabled')
      this.geocodeButton.removeAttr('disabled')
    },

    loadFile: function (event) {
      let file = event.target.files[0]
      let self = this

      Papa.parse(file, {
        header: true,
        complete: function (res) {
          self.reset()
          self.rowCount = res.data.length
          self.geocoder.input = res.data
          self.geocoder.output = new Array(self.rowCount)
          self.geocoder.fields = new Set(res.meta.fields)
          self.populateFields(res.meta.fields)
        }
      })
    },

    addFailure: function (data) {
      this.failures.append('Row ' + data.row + ': ' + data.text + '<br>')
    },

    toggleFailures: function () {
      console.log('toggling')
      if (this.failures.hasClass('hidden')) {
        this.failureButton.text('Hide Failures')
      } else {
        this.failureButton.text('View Failures')
      }
      this.failures.toggleClass('hidden')
    },

    makeFeature: function (data) {
      let geometry = {
        'type': 'Point',
        'coordinates': [data.longitude, data.latitude]
      }

      let properties = Object.assign({}, data)
      delete properties.latitude
      delete properties.longitude

      return {
        'type': 'Feature',
        'properties': properties,
        'geometry': geometry
      }
    },

    makeCSV: function (arr) {
      let rowDefault = {}
      for (let i = 0; i < this.geocoder.fields.length; i++) {
        let field = this.geocoder.fields[i]
        rowDefault[field] = ''
      }

      this.csv = []
      for (let i = 0; i < arr.length; i++) {
        let row = arr[i]
        let rowFields = new Set(Object.keys(row))
        if (rowFields !== this.geocoder.fields) {
          row = Object.assign({}, rowDefault, row)
        }
        this.csv.push(row)
      }

      this.csv = Papa.unparse(this.csv)
      this.csv = encodeURIComponent(this.csv).replace(/%0D%0A(%2C)+%0D/, '%0D')

      this.csvButton.removeAttr('disabled')
      this.csvButton.text('')
      let csvLink = $('<a/>')
      csvLink.html('CSV')
      csvLink.attr({
        'href': 'data:application/csvcharset=utf-8,' + this.csv,
        'target': '_blank',
        'download': 'dcmar.csv'
      })
      this.csvButton.append(csvLink) 
    },

    makeGeoJSON: function (arr) {
      let features = []
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]) {
          features.push(this.makeFeature(arr[i]))
        }
      }

      this.geojson = JSON.stringify({
        'type': 'FeatureCollection',
        'features': features
      }, null, '\t')

      this.geojsonButton.removeAttr('disabled')
      this.geojsonButton.text('')
      let geojsonLink = $('<a/>')
      geojsonLink.html('GeoJSON')
      geojsonLink.attr({
        'href': 'data:text/jsoncharset=utf-8,' + encodeURIComponent(this.geojson),
        'target': '_blank',
        'download': 'dcmar.json'
      })
      this.geojsonButton.append(geojsonLink)

      this.gistButton.removeAttr('disabled')
    },

    postGist: function () {
      let fileDescription = 'Map generated by https://emanuelfeld.github.io/mardc on ' + new Date()

      let data = {
        'description': fileDescription,
        'public': true,
        'files': {
          'map.json': {
            'content': this.geojson
          }
        }
      }

      let apiURL = 'https://api.github.com/gists'
      let self = this
      $.post(apiURL, JSON.stringify(data), function (res) {
        let gistResult = $('#gistResult')
        gistResult.attr('href', res.html_url)
        gistResult.text('Click here to view shareable map')
        self.gistButton.addClass('hidden')
      })
    },

    populateFields: function (fields) {
      $('.option').remove()
      for (let i = 0; i < fields.length; i++) {
        let field = new Option(fields[i], fields[i])
        $(field).attr('class', 'option')
        this.fieldMenu.append($(field))
      }
      this.fieldMenu.removeAttr('disabled')
    },

    addMarker: function (lat, lon) {
      let location = new google.maps.LatLng(lat, lon)
      let self = this
      let marker = new google.maps.Marker({
        position: location,
        map: self.map
      })
      this.markers.push(marker)
    },

    clearMarkers: function () {
      for (let i = 0; i < this.markers.length; i++) {
        this.markers[i].setMap(null)
      }
    },

    getBounds: function (objArray, key) {
      let maxValue = -Infinity
      let minValue = Infinity
  
      for (let i = 0; i < objArray.length; i++) {
        if (objArray[i][key] !== 0) {
          maxValue = Math.max(objArray[i][key], maxValue)
          minValue = Math.min(objArray[i][key], minValue)
        }
      }

      return [minValue, maxValue]
    },

    zoomToMarkers: function (output) {
      let [latMin, latMax] = this.getBounds(output, 'latitude')
      let [lonMin, lonMax] = this.getBounds(output, 'longitude')

      if ([latMin, latMax, lonMin, lonMax].every(Number.isFinite)) {
        let mapBounds = new google.maps.LatLngBounds()
        let minBounds = new google.maps.LatLng(latMin, lonMin)
        let maxBounds = new google.maps.LatLng(latMax, lonMax)

        mapBounds.extend(minBounds)
        mapBounds.extend(maxBounds)
        this.map.fitBounds(mapBounds)        
      }
    },

    monitorProgress: function (output) {
      this.processedCount++
      $('#progress').text(this.successCount + ' of ' + this.rowCount + ' found and ' + this.failureCount + ' failures')

      if (this.processedCount === this.rowCount) {
        this.zoomToMarkers(output)
        this.makeGeoJSON(output)
        this.makeCSV(output)
        this.geojsonButton.removeAttr('disabled')
        this.csvButton.removeAttr('disabled')
      }
    }
  }

  var Geocoder = function (app, map) {
    this.delay = 200
    this.app = app
    this.input = []
    this.output = []
    this.failures = []
  }

  Geocoder.prototype = {
    reset: function () {
      this.output = new Array(this.input.length)
      this.failures = []
    },

    run: function (field) {
      let index = 0
      let self = this
      function runner () {
        if (index < self.input.length) {
          self.geocodeAddress(self.input[index][field], index)
          index++
        } else {
          clearInterval(timer)
        }
      }

      let timer = setInterval(runner, this.delay)
    },

    geocodeAddress: function (address, index) {
      let encodedAddress = encodeURIComponent(address.toLowerCase().replace(/[ ]/g, '+'))

      let url = 'https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20xml%20WHERE%20url%3D%27http%3A%2F%2Fgeospatial.dcgis.dc.gov%2FwsProxy%2Fproxy_LocVerifier.asmx%2FfindLocation_all%3Fstr%3D' + encodedAddress + "%27%20AND%20itemPath%3D%27ReturnObject.returnDataset.diffgram.NewDataSet.Table1'&format=json&diagnostics=true&callback="
      let self = this

      let data = {
        'latitude': 0,
        'longitude': 0
      }

      if (address.length > 0) {
        $.get(url, function (res) {
          try {
            data = res.query.results.Table1

            if (data.length > 0) {
              data = data[0]
            }

            data['latitude'] = parseFloat(data['LATITUDE'])
            data['longitude'] = parseFloat(data['LONGITUDE'])
            delete data['LATITUDE']
            delete data['LONGITUDE']

            self.output[index] = Object.assign(self.input[index], data)

            self.fields = new Set([...self.fields, Object.keys(data)])
            self.app.addMarker(data['latitude'], data['longitude'])
            self.app.successCount++
          } catch (e) {
            self.output[index] = Object.assign(self.input[index], data)
            self.app.failureCount++
            self.app.addFailure({
              'row': index + 1,
              'text': address
            })
          }

          self.app.monitorProgress(self.output)
        })
      } else {
        self.app.successCount++
        self.app.monitorProgress(self.output)
      }
    }
  }

  window.onload = function () {
    let app = new App()

    app.uploadButton.on('change', function (event) {
      app.loadFile(event)
    })

    app.fieldMenu.on('change', function (event) {
      app.reset()
    })

    app.failureButton.on('click', function (event) {
      app.toggleFailures()
    })

    app.geocodeButton.on('click', function (event) {
      app.reset()
      app.map = new google.maps.Map(document.getElementById('map'), app.mapOptions)
      let locationField = $('#fieldMenu option:selected').text()
      app.geocoder.run(locationField)
    })

    app.gistButton.on('click', function (event) {
      app.postGist()
    })
  }
})()
