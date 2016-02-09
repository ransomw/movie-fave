/*global require */

window._ = require('underscore');
// ensure backbone is loaded before marionette
var Bb = require('backbone');
var Mn = require('backbone.marionette');

/* ??? is this necessary when using node-underscorify?
 */
// marionette was originally designed to load templates from the DOM.
// when using it with a setup that involves a module system, for
// instance, it's possible to override the default behavior
// http://marionettejs.com/docs/v2.4.4/marionette.templatecache.html#override-template-retrieval
Mn.TemplateCache.prototype.loadTemplate = function (templateId, options){
  var myTemplate = templateId;
  return myTemplate;
};

var Router = require('./router');
var faves = require('./models').faves;

var Application = Mn.Application.extend({
  onStart: function (opt_args) {

    console.log("application onStart");

    var router = new Router({});
    Bb.history.start({pushState: true});
    /* ??? is this the preferred method for default routes?
     */
    /* todo: duplicates string from router */
    // Bb.history.loadUrl('search/');
  }
});

var app = new Application({});

// idea: display application name header as soon as page loads
faves.fetch().done(function () {
  app.start();
});
