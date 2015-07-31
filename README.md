[![Build Status](https://travis-ci.org/emanuelfeld/mardc.svg)](https://travis-ci.org/emanuelfeld/mardc)

# mardc

A node wrapper for querying the DC GIS Master Address Repository. You can use it to search street addresses, intersections, blocks, and place names in Washington, DC. Additional documentation on the MAR is available [here](http://dcatlas.dcgis.dc.gov/mar/search.aspx).

### Installation

     npm install git+https://git@github.com/emanuelfeld/mardc.git

### Examples

```

var mardc = require('mardc');

// intersection
mardc('14th ST NW and Pennsylvania Avenue NW', function (error, data) {
	// up to you
});

// block
mardc('400 Block of 4th St NW', function (error, data) {
	// up to you
});

// place name
mardc('Dupont Circle', function (error, data) {
	// up to you
});

// street address
mardc('1600 Pennsylvania Ave NW', function (error, data) {
	console.log(data);
});

```

The above code would output:

```
{ results: 
   [ { id: 'Table11',
       rowOrder: '0',
       ADDRESS_ID: '293211',
       STATUS: 'ACTIVE',
       FULLADDRESS: '1600 PENNSYLVANIA AVENUE NW',
       ADDRNUM: '1600',
       STNAME: 'PENNSYLVANIA',
       STREET_TYPE: 'AVENUE',
       QUADRANT: 'NW',
       CITY: 'WASHINGTON',
       STATE: 'DC',
       XCOORD: '396829.87',
       YCOORD: '136646.99',
       SSL: '0187S   0800',
       ANC: 'ANC 2A',
       PSA: 'Police Service Area 207',
       WARD: 'Ward 2',
       NBHD_ACTION: [Object],
       POLDIST: 'Police District - Second District',
       ROC: 'NA',
       CENSUS_TRACT: '006202',
       VOTE_PRCNCT: 'Precinct 2',
       SMD: 'SMD 2A01',
       ZIPCODE: '20500',
       NATIONALGRID: '18S UJ 23390 07392',
       ROADWAYSEGID: '2522',
       FOCUS_IMPROVEMENT_AREA: 'NA',
       HAS_ALIAS: 'Y',
       HAS_CONDO_UNIT: 'N',
       HAS_RES_UNIT: 'N',
       HAS_SSL: 'Y',
       LATITUDE: '38.89766766',
       LONGITUDE: '-77.03654468',
       RES_TYPE: 'NON RESIDENTIAL',
       WARD_2002: 'Ward 2',
       WARD_2012: 'Ward 2',
       ANC_2002: 'ANC 2A',
       ANC_2012: 'ANC 2A',
       SMD_2002: 'SMD 2A05',
       SMD_2012: 'SMD 2A01',
       IMAGEURL: 'http://citizenatlas.dc.gov/mobilevideo',
       IMAGEDIR: 'NO_IMAGE',
       IMAGENAME: 'No_Image_Available.JPG',
       ConfidenceLevel: '100' } ] }
```
