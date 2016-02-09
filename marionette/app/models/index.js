/*global require, module */

var Search = require('./search');
var movie = require('./movie');
var fave = require('./fave');

var exports = {};

exports.Search = Search;
exports.Movie = movie.Movie;
exports.Movies = movie.Movies;
exports.faves = fave.faves;
exports.Fave = fave.Fave;

module.exports = exports;

