/*global require, __dirname, process */
/*jslint white: true */

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const deepFreeze = require('deep-freeze');
const _ = require('lodash');

const FAVES_ENDPOINT = '/favorites';
const DEFAULT_OPTS = deepFreeze({
	dir_client: path.join(__dirname, 'public'),
	url_client: '/'
});

const make_app = function (opt_args) {
	const opts = deepFreeze(
		_.merge(_.cloneDeep(DEFAULT_OPTS), opt_args || {}));
	const app = express();

	app.locals.path_data_file = path.join(__dirname, 'data.json');

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	app.use(opts.url_client, express.static(opts.dir_client));

	app.get(FAVES_ENDPOINT, function(req, res){
		var data = fs.readFileSync(app.locals.path_data_file);
		res.setHeader('Content-Type', 'application/json');
		res.send(data);
	});

	app.post(FAVES_ENDPOINT, function(req, res){
		if(!req.body.name || !req.body.oid){
			res.send("Error");
			return;
		}
		var data = JSON.parse(fs.readFileSync(app.locals.path_data_file));
		data.push(req.body);
		fs.writeFile(app.locals.path_data_file, JSON.stringify(data));
		res.setHeader('Content-Type', 'application/json');
		res.send(data);
	});

	return app;
};

module.exports = make_app;
