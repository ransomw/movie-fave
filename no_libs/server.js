/*global require, __dirname, process */
/*jslint white: true */

var express = require('express');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');

var FAVES_ENDPOINT = '/favorites';

var app = express();

app.locals.path_data_file = path.join(__dirname, 'data.json');

app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, 'public')));

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

module.exports = app;
