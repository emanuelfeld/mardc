var request = require("request");

module.exports = mardc;

var mardc = function (search) {
	var terms = {str: search};
	var uri = "https://geospatial.dcgis.dc.gov/wsProxy/proxy_LocVerifier.asmx/findLocation_all"
	request({
		uri: uri,
		qs: terms
	}, function(error,response,body) {
		try {
			console.log(body);
		} catch (err) {
			console.log("Error thrown!")
		}
	});
};
