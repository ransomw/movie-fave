/*global require, module */

var Mn = require('backbone.marionette');

var models = require('../models');

// idea: use setTimeout to fetch faves at a regular interval while
//       this view is active, and update view state w/ new data.
//       be careful to maintain detail views' show/hide status.

var FavesListItemView = Mn.LayoutView.extend({
  template: require('../templates/faves_item.html'),
  tagName: 'li',

  ui: {
    a_title: 'a',
    div_details: '.details'
  },

  events: {
    'click @ui.a_title': 'on_click_title'
  },

  on_click_title: function () {
    if (!this.showing_details) {
      this.ui.div_details.show();
      this.showing_details = true;
    } else {
      this.ui.div_details.hide();
      this.showing_details = false;
    }
  }
});

var FavesListEmptyView = Mn.LayoutView.extend({
  template: require('../templates/faves_none.html')
});

var FavesListView = Mn.CollectionView.extend({
  tagName: 'ul',
  childView: FavesListItemView,
  emptyView: FavesListEmptyView
});

var FavesView = Mn.LayoutView.extend({
  template: require('../templates/faves.html'),
  tagName: 'div',

  regions: {
    faves_list: '.view-faves-list'
  },

  onShow: function () {
    var self = this;
    var faves = this.collection;
    var movies = new models.Movies();
    var view_faves_list = new FavesListView({
      collection: movies
    });
    faves.forEach(function (fave) {
      movies.add({id: fave.id});
    });
    movies.fetch().done(function () {
      self.showChildView('faves_list', view_faves_list);
    });
  }
});

module.exports = FavesView;
