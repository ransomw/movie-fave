/*global require, module */

var Mn = require('backbone.marionette');

var MainView = require('./views/main');

var Controller = Mn.Object.extend({
  initialize: function () {
    var main_view = new MainView();
    main_view.render();
    this.options.main_view = main_view;
  },

  movieSearch: function () {
    var main_view = this.getOption('main_view');
    console.log("search view unimplemented");
    main_view.triggerMethod('show:search');
  },

  movieFaves: function () {
    var main_view = this.getOption('main_view');
    console.log("faves view unimplemented");
    main_view.triggerMethod('show:faves');
  }
});

/* ??? given that controller methods are specified as strings,
 *     when does the program check to see if the controller has
 *     the desired methods defined?
 */
var Router = Mn.AppRouter.extend({
  // parens are optional when calling a "constructor" with no arguments
  // so `new Controller` and `new Controller()` are equivalent.
  // i find that using parens helps consistency.
  controller: new Controller(),
  appRoutes: {
    'search/': 'movieSearch',
    'faves/': 'movieFaves'
  }
});

module.exports = Router;
