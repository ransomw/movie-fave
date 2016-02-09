/*global require, module */

var Bb = require('backbone');
var Mn = require('backbone.marionette');

var models = require('../models');

// idea: cache searches and movie data to prevent additional
//       omdbapi requests
// https://en.wikipedia.org/wiki/Cache_(computing)
//       in particular,
//       * write and use a `Backbone.Collection` to store searches
//       * use a single Movies collection with filter
// http://marionettejs.com/docs/v2.4.4/marionette.collectionview.html#collectionviews-filter
//         rather than instantiating new Movies collections

var SearchResultsItemDetailsView = Mn.LayoutView.extend({
  template:
  require('../templates/search_results_item_details.html'),
  template_loading:
  require('../templates/search_results_item_details_loading.html'),
  tagName: 'div',

  modelEvents: {
    'change': 'render'
  },

  getTemplate: function () {
    var movie = this.model;
    if (movie.has_details()) {
      return this.getOption('template');
    } else {
      return this.getOption('template_loading');
    }
  }
});

var SearchResultsItemView = Mn.LayoutView.extend({
  template: require('../templates/search_results_item.html'),
  tagName: 'li',

  regions: {
    details: '.view-details'
  },

  ui: {
    a_title: 'a',
    btn_fave: 'button',
    // ui elements are specified with jquery selectors
    // http://api.jquery.com/category/selectors/
    spin_fave: 'div[class^=spin-]'
  },

  events: {
    'click @ui.a_title': 'on_click_title',
    'click @ui.btn_fave': 'on_click_fave'
  },

  modelEvents: {
    'change:is_fave': 'update_fave_btn'
  },

  update_fave_btn: function () {
    var movie = this.model;
    this.ui.spin_fave.hide();
    if (movie.get('is_fave')) {
      this.ui.btn_fave.hide();
    } else {
      this.ui.btn_fave.show();
    }
  },

  on_click_title: function () {
    var movie = this.model;
    var view_details;
    /* ??? cleaner way to manage view state ?
     */
    if (!this.showing_details) {
      view_details = new SearchResultsItemDetailsView({model: movie});
      if (!movie.has_details()) {
        movie.fetch();
      }
      this.showChildView('details', view_details);
      this.showing_details = true;
    } else {
      this.getRegion('details').reset();
      this.showing_details = false;
    }
  },

  on_click_fave: function () {
    var movie = this.model;
    var fave = new models.Fave({
      id: movie.id,
      title: movie.get('title')
    });
    this.ui.btn_fave.hide();
    this.ui.spin_fave.show();
    // passing an empty object saves all attributes
    fave.save({}, {parse: false});
  }
});

var SearchResultsEmptyView = Mn.LayoutView.extend({
  template: require('../templates/search_results_none.html')
});

var SearchResultsListView = Mn.CollectionView.extend({
  tagName: 'ul',
  childView: SearchResultsItemView,
  emptyView: SearchResultsEmptyView
});

var SearchResultsView = Mn.LayoutView.extend({
  template: require('../templates/search_results.html'),
  tagName: 'div',

  regions: {
    results_list: '.results-list'
  },

  modelEvents: {
    // same as
    // `this.listenTo(view.model, 'change', this.render)`
    /* todo: use a custom or otherwise more specific event
     *       to indicate data being fetched from server
     */
    'change': 'display_results'
  },

  display_results: function () {
    console.log("this.model in change callback");
    console.log(this.model);

    var movies = new models.Movies();
    var view_results_list = new SearchResultsListView({
      collection: movies
    });
    this.model.get('results').forEach(function (search_result) {
      // since models.Movies.model is defined, it's not necessary
      // to instantiate a models.Movie object
      movies.add({
        title: search_result.title,
        year: search_result.year,
        id: search_result.id_imdb
      });
    });
    this.showChildView('results_list', view_results_list);
  }
});

var SearchFormBehavior = Mn.Behavior.extend({

  ui: {
    form_search: 'form',
    input_title: 'form input'
  },

  events: {
    'submit @ui.form_search': 'run_search'
  },

  run_search: function () {
    var str_search = this.get_search_string();
    var search = new models.Search({id: str_search});
    var view_results = new SearchResultsView({
      model: search
    });
    /* ??? is a more common pattern to fetch in before passing
     *     to the view or when the view initializes?
     */
    search.fetch();
    /* ??? using `this.view` introduces strong coupling.
     *     is there an event/trigger-driven way to do this?
     */
    this.view.showChildView('results', view_results);
  },

  get_search_string: function () {
    return this.ui.input_title[0].value.trim();
  }
});

var SearchView = Mn.LayoutView.extend({
  template: require('../templates/search.html'),
  tagName: 'div',

  regions: {
    results: '.results'
  },

  behaviors: {
    form: {
      behaviorClass: SearchFormBehavior
    }
  },

  onShow: function () {
    console.log("search view onShow");
  }
});

module.exports = SearchView;
