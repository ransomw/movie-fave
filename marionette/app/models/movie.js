/*global require, module */

var $ = require('jquery');
var _ = require('underscore');

var base = require('./base');

var faves = require('./fave').faves;

var Movie = base.Model.extend({
  url: function () {
    return 'http://www.omdbapi.com/?i=' + this.id;
  },

  constructor: function () {
    var self = this;
    base.Model.apply(this, arguments);
    this.set_is_fave();
    this.listenTo(faves, 'update', this.set_is_fave);
  },

  parse: function (resp, opts) {
    if (resp.imdbID !== this.id) {
      throw new Error("omdb returned unexpected imdb id");
    }
    return {
      title: resp.Title,
      year: resp.Year,
      plot_summary: resp.Plot,
      url_img_poster: resp.Poster
    };
  },

  has_details: function () {
    return this.get('plot_summary') && this.get('url_img_poster');
  },

  set_is_fave: function () {
    this.set('is_fave', this.is_fave());
  },

  is_fave: function () {
    var self = this;
    return faves.some(function (fave) {
      return fave.id === self.id;
    });
  }
});

var Movies = base.Collection.extend({
  model: Movie,

  // there is no default collection of movies, so fetch the collection
  // by updating each model while (somewhat) mimicing default fetch
  fetch: function () {
    var self = this;
    var inst_xhrs = this.map(function (movie) {
      return movie.fetch();
    });
    return $.when.apply($, inst_xhrs).then(function () {
      self.trigger('sync');
    });
  }
});

var exports = {};

exports.Movie = Movie;
exports.Movies = Movies;

module.exports = exports;
