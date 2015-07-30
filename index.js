var YQL = require("yql");

var mardc = function (search, callback) {
	var query = new YQL("SELECT * FROM xml WHERE url='http://geospatial.dcgis.dc.gov/wsProxy/proxy_LocVerifier.asmx/findLocation_all?str=" + encodeURIComponent(search) + "' AND itemPath='ReturnObject.returnDataset.diffgram.NewDataSet.Table1'")
	query.exec(function (error, response) {
		if (error) return callback(error);
		try {
			var result = response.query.results.Table1;
			if (result.length > 0) {
				callback(null, { "results": result });
			} else {
				callback(null, { "results": [result] });
			}
		} catch (error) {
			return callback(error)
		}
	});
};

module.exports = mardc;
