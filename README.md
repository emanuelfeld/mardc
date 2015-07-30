# mardc

A node wrapper for querying the DC GIS Master Address Repository. You can use it to search street addresses, intersections, blocks, and place names in Washington, DC. Additional documentation on the MAR is available [here](http://dcatlas.dcgis.dc.gov/mar/search.aspx).

### Installation

     npm install git+https://git@github.com/emanuelfeld/mardc.git

### Examples

```

var mardc = require('mardc');

// street address
mardc('1600 Pennsylvania Ave NW', function (error, data) {
	// up to you
});

// intersection
mardc('14th ST NW and Pennsylvania Avenue NW', function (error, data) {
	// up to you
});

// block
mardc('1600 Pennsylvania Ave NW', function (error, data) {
	// up to you
});

// place name
mardc('Dupont Circle', function (error, data) {
	// up to you
});

```
