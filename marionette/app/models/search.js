/*global require, module */

var base = require('./base');

var str_2_query_arg = function (str_search) {
  return str_search.replace(/ /g, '+');
};

var Search = base.Model.extend({

  url: function () {
    return 'http://www.omdbapi.com/?s=' +
      str_2_query_arg(this.id);
  },

  /*
   str_search: function () {
     return this.id;
   },
   */

  parse: function (resp, opts) {
    var titles;
    var results;
    if (!resp.Search) {
      if (resp.Error === 'Movie not found!') {
        results = [];
      } else {
        throw new Error("unexpected response from omdbapi");
      }
    } else {
      results = resp.Search.map(function (search_res) {
        return {
          title: search_res.Title,
          year: search_res.Year,
          id_imdb: search_res.imdbID
        };
      });
    }
    return {results: results};
  }
});

module.exports = Search;
