/*global require, module */

var base = require('./base');

var FAVES_ENDPOINT = '/favorites';

var Fave = base.Model.extend({

  url: function () {
    return FAVES_ENDPOINT;
  },

  constructor: function () {
    base.Model.apply(this, arguments);
    this.once('sync', this.add_to_faves);
  },

  parse: function (resp, opts) {
    // do not set attributes after save when given {parse: false} option
    if (opts && !opts.parse) {
      return undefined;
    }
    return {
      id: resp.oid,
      title: resp.name
    };
  },

  toJSON: function () {
    return {
      oid: this.id,
      name: this.get('title')
    };
  },

  isNew: function () {
    var self = this;
    return !faves.some(function (fave) {
      return fave.id === self.id;
    });
  },

  add_to_faves: function () {
    faves.add(this);
  }
});

var Faves = base.Collection.extend({
  model: Fave,
  url: FAVES_ENDPOINT

  // for debug

  ,
  constructor: function () {
    base.Collection.apply(this, arguments);
    this.on('change', function () {
      console.log("faves change event fired");
    });
    this.on('add', function () {
      console.log("faves add event fired");
    });
  }

});

// expose faves collection as a singleton
// https://en.wikipedia.org/wiki/Singleton_pattern
var faves = new Faves();

var exports = {};

exports.Fave = Fave;
exports.faves = faves;

module.exports = exports;
