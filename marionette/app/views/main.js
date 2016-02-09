/*global require, module */

var Bb = require ('backbone');
var Mn = require('backbone.marionette');

var faves = require('../models').faves;

var SearchView = require('./search');
var FavesView = require('./faves');

var MainView = Mn.LayoutView.extend({
  // may be any jquery selector
  /* todo: duplicate string w/ index template */
  el: '#application',
  template: require('../templates/main.html'),

  regions: {
    content: '#view-content'
  },

  ui: {
    a_search: 'nav .search a',
    a_faves: 'nav .faves a'
  },

  /* ??? not sure if the trigger system actually relies on events
   *     under the hood
   */
  // note the special naming convention for triggers:
  // a trigger event`'foo:bar'` will call the function `onFooBar`
  triggers: {
    'click @ui.a_search': 'show:search',
    'click @ui.a_faves': 'show:faves'
  },

  onShowSearch: function () {
    var search_view = new SearchView();
    // abbreviation for
    // `this.getRegion('search').show(search_view)`
    this.showChildView('content', search_view);
    /* todo: duplicate string */
    Bb.history.navigate('search/');
  },

  onShowFaves: function () {
    var faves_view = new FavesView({collection: faves});
    this.showChildView('content', faves_view);
    /* todo: duplicate string */
    Bb.history.navigate('faves/');
  }

});

module.exports = MainView;
