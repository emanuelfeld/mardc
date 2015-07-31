var mardc = require('../index.js');
var tap = require('tap');

mardc('1600 Pennsylvania Ave NW', function (err, data) {
	var x;
	try {
		x = data.results[0]['FULLADDRESS'];
	} catch(err) {
		console.log("Data not found");
	} finally {
		tap.equal(x, '1600 PENNSYLVANIA AVENUE NW');
	}
});

mardc('House', function (err, data) {
	var x;
	try {
		x = data.results.length > 1;
	} catch(err) {
		console.log("Data not found");
	} finally {
		tap.equal(x, true);
	}
});

tap.type(mardc, 'function');
