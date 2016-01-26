'use strict';
// the first line in this file invokes something called "strict mode."
//  one invokes strict mode by placing that line at the top of a file
//  or function, and it must be the first statement in the file or
//  function.
//
//  the notion of strict mode is like pragmas in Perl or Haskell.
//  as languages evolve, while it's helpful to maintain backwards
//  compatability, sometimes language designers want their users
//  to be able to have access to a slightly different version of the
//  langauge, and this is what strict mode does is javascript.
//
//  the strict mode differences are very slight.
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode

// these comments are for linting and syntax-highlighting
// in a text editor.
/*global Promise, document, alert, XMLHttpRequest */
/*jslint white: true */

/* todo: double-check promise error-handling */

/* todo: subclass rather than polyfill */
// adapted from
// https://github.com/matthew-andrews/Promise.prototype.finally
Promise.prototype.finally = function finallyPolyfill(callback) {
	var constructor = this.constructor;
	return this.then(function(value) {
		return constructor.resolve(callback()).then(function() {
			return value;
		});
	}, function(reason) {
		return constructor.resolve(callback()).then(function() {
			throw reason;
		});
	});
};

// top-level javascript "module"


// (function (){ // here be dragons ...}()) is a common
// pattern called an "immediate function."  it creates an anonymous
// function then immediately calls it.
// immediate functions are useful for providing logical encapsulation.
// for instance, variables declared in the anonymous
// function aren't visible elsewhere unless the function returns them.
(function () {
  var FAVES_ENDPOINT = '/favorites';
  var TEMPLATES = {};
  var DOM_ELEMS = {};
  var SECTION_NAMES = {
    loading: 'loading',
    search: 'search',
    faves: 'faves'
  };

  var impl_error = function (msg) {
    var err_msg = "Implementation error: " + msg.toString();
    alert(err_msg);
    throw new Error(err_msg);
  };

  // this is a js common "utility" function provided by libraries like
  // lodash http://lodash.com
  // instead of fn([1, 2]), spread allows spread(fn)(1, 2),
  // often -- but not always -- improving readability.
  // it is also an example of a "closure,"
  // https://en.wikipedia.org/wiki/Closure_(computer_programming)
  // which is a common pattern in many programming languages.
  var spread = function (fn) {
    return function (some_array) {
      return fn.apply(this, some_array);
    };
  };

  var Template = function (str_template) {
    this.str = str_template;
  };

  Template.prototype.render = function(params) {
    var str_rendering = this.str;
    Object.keys(params).forEach(function (param_key) {
      var param_val = params[param_key];
      str_rendering = str_rendering.replace(
        new RegExp('{{\\s*' + param_key + '\\s*}}', 'g'),
        param_val.toString());
    });
    return str_rendering;
  };

  var show_section = function(section_name_show) {
    var section_to_show = DOM_ELEMS.SECTIONS[section_name_show];
    if (!section_to_show) {
      impl_error("in show_section, got unknown section name '" +
                 section_name_show + "'");
    }
    Object.keys(DOM_ELEMS.SECTIONS).forEach(function (section_name_hide) {
      DOM_ELEMS.SECTIONS[section_name_hide].hidden = true;
    });
    section_to_show.hidden = false;
  };

  // XMLHttpRequest https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
  // allows communication between javascripts and
  // web servers as well as filesystems.
  // the name is confusing for historical reasons.
  // for the purposes of this application, it allows sending HTTP
  // to the server side and getting responses back.
  //
  // this function "wraps" an XMLHttpRequest in a promise,
  // which is a (slightly) easier way for me to think about concurrency.
  // communication with the server requires concurrency because
  // we'd like the the UI to remain active while data is being
  // transferred in the background.
  //
  // if you're interested in other approaches to concurrency,
  // consider reading about
  // Communicating Sequential Processes
  // http://swannodette.github.io/2013/07/12/communicating-sequential-processes/
  var make_xhr_promise = function (xhr) {
    return new Promise(function (resolve, reject) {
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(xhr.statusText);
        }
      };
      xhr.onerror = function () {
        reject(xhr.statusText);
      };
    });
  };

  var http_get = function (url){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.send();
    return make_xhr_promise(xhr);
  };

  /* todo: duplicates some code from http_get */
  var http_post_json =function (url, post_data){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader("Content-Type",
                         "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(post_data));
    return make_xhr_promise(xhr);
  };

  var http_get_json = function (url) {
    return http_get(url).then(function (str_res) {
      return JSON.parse(str_res);
    });
  };

  var is_valid_search = function (str_search) {
    /* todo */
    return true;
  };

  var str_2_query_arg = function (str_search) {
    return str_search.replace(/ /g, '+');
  };

  var get_faves = function () {
    return http_get_json(FAVES_ENDPOINT);
  };

  var get_movie_data = function (str_title) {
    return http_get_json('http://www.omdbapi.com/?t=' +
                         str_2_query_arg(str_title));
  };

  // idea: this only returns the top ten search results.
  //       explore the the OMDB HTTP API and try to return all results.
  var search_movies = function (str_search) {
    // chaining promises in a promise that immediately resolves
    // like this is common pattern when using 3rd party promise
    // libraries like q, when, or bluebird
    /* todo: explain why */
    var promise_search = (new Promise(function (resolve) {
      resolve();
    })).then(function () {
      // i tend to use single-quotes for strings that are meant to be
      // read by computers and double quotes for strings that are
      // meant to be read by people.
      return http_get_json('http://www.omdbapi.com/?s=' +
                           str_2_query_arg(str_search));
    }).then(function (json_search_res) {
      if (!json_search_res.Search) {
        if (json_search_res.Error === 'Movie not found!') {
          return [];
        }
        impl_error("in search_movies, unexpected result from "+
                   "omdb: " + json_search_res.Error);
      }
      return json_search_res.Search;
    });

    var promise_movie_infos = promise_search.then(function (res_arr) {
      return Promise.all(res_arr.map(function (res_obj) {
        return get_movie_data(res_obj.Title);
      }));
    });

    // note the difference between a promise and a function that
    // returns a promise
    var promise_infos_flagged = Promise.all([
      promise_movie_infos, get_faves()
    ]).then(spread(function (movie_infos, faves) {
      var updated_infos = movie_infos.map(function (movie_info) {
        if (faves.filter(function (fave) {
          /* todo: have get_movie_data object with custom properties
                   for smooth abstraction between 3rd party API
                   and application logic */
          return fave.oid === movie_info.imdbID;
        }).length === 0) {
          movie_info.is_fave = false;
        } else {
          movie_info.is_fave = true;
        }
        return movie_info;
      });
      return updated_infos;
    }));

    return promise_infos_flagged;
  };

  var load_templates = function() {
    return Promise.all([
      http_get('/templates/search_item.html'),
      http_get('/templates/fave_item.html')
    ]).then(spread(function (str_search_template, str_fave_template) {
      // idea: implement a zip_object function
      //       https://lodash.com/docs#zipObject
      //       to avoid `str_*_template` variables
      TEMPLATES.search_item = new Template(str_search_template);
      TEMPLATES.fave_item = new Template(str_fave_template);
      Object.freeze(TEMPLATES);
    }));
  };

  var onclick_fave = function () {
    var post_data = {
      name: this.dataset.title,
      oid: this.dataset.oid
    };
    var div_button = this.parentElement;
    /* todo: setting innerHTML might not be the best way to
             manipulate the DOM.  consider alternatives, provided
             they are consistent and simple */
     // probably isn't a great idea.
     // using a template or editing an attribute rather than
     // placing html strings in javascript...
     // this might serve as an example of "technical debt"
    div_button.innerHTML =
      '<div class="spin-rotating-plane"></div>';
    http_post_json(FAVES_ENDPOINT, post_data).then(function () {
      // note that using `this` and `button_fave` are not the same
      // object in this function's "scope"
      div_button.innerHTML = "";
    });
  };

  // event listeners are one of the most common use cases
  // for closures in javascript
  var make_onclick_title = function (div_details) {
    return function () {
      var a_title = this;
      div_details.hidden = !div_details.hidden;
    };
  };

  var attach_search_item_listeners = function (li_item) {
    var button_fave = li_item.getElementsByTagName('button')[0];
    var div_details = li_item.getElementsByClassName('details')[0];
    var a_title = li_item.getElementsByTagName('a')[0];
    button_fave.onclick = onclick_fave;
    // idea: make an animation effect for smooth transitions between
    //       show and hide state (hint: use the `overflow` css attribute
    //       and a javascript function like `setInterval` or `setTimeout`)
    a_title.onclick = make_onclick_title(div_details);
  };

  var attach_fave_item_listeners = function (li_item) {
    var div_details = li_item.getElementsByClassName('details')[0];
    var a_title = li_item.getElementsByTagName('a')[0];
    a_title.onclick = make_onclick_title(div_details);
  };

  var update_faves = function () {
    return get_faves().then(function (faves) {
      return Promise.all(faves.map(function (fave) {
        return get_movie_data(fave.name);
      }));
    }).then(function (movie_infos) {
      var rendered_templates = movie_infos.map(function (res_obj) {
        var render_context = {
          title: res_obj.Title,
          year: res_obj.Year,
          plot_summary: res_obj.Plot,
          url_img_poster: res_obj.Poster
        };
        if (render_context.url_img_poster === 'N/A') {
          render_context.url_img_poster = '/images/unavailable.jpg';
        }
        if (render_context.plot_summary === 'N/A') {
          render_context.plot_summary = "plot summary unavailable";
        }
        return TEMPLATES.fave_item.render(render_context);
      });
      DOM_ELEMS.FAVES.ul_faves.innerHTML =
        rendered_templates.join('\n');
      if (rendered_templates.length === 0) {
        DOM_ELEMS.FAVES.span_no_faves.hidden = false;
      } else {
        DOM_ELEMS.FAVES.span_no_faves.hidden = true;
      }
      Array.prototype.slice
        .call(DOM_ELEMS.FAVES.ul_faves
              .getElementsByTagName('li'))
        .forEach(attach_fave_item_listeners);
    });
  };

  var onclick_search = function () {
    // .trim() removes leading and trailing spaces
    var title_query = DOM_ELEMS.SEARCH.input.value.trim();
    show_section(SECTION_NAMES.loading);
    // idea: use Array.prototype.sort() to sort the search results
    search_movies(title_query)
      .then(function (movie_infos_flagged) {
        var rendered_templates = movie_infos_flagged.map(
          function (res_obj) {
            var render_context = {
              is_fave: res_obj.is_fave,
              title: res_obj.Title,
              year: res_obj.Year,
              plot_summary: res_obj.Plot,
              url_img_poster: res_obj.Poster,
              oid: res_obj.imdbID
            };
            // the following lines do the same thing:
            // the omdb API returns the string 'N/A' when a plot or poster
            // is unavailable.  so these template parms are
            // appropriately set below.
            // the first example uses if as usual, and the second
            // uses a a ternary operator `cond ? true_val : false_val`
            if (render_context.url_img_poster === 'N/A') {
              render_context.url_img_poster = '/images/unavailable.jpg';
            }
            render_context.plot_summary =
              render_context.plot_summary === 'N/A' ?
              "plot summary unavailable" :
              render_context.plot_summary;
            return TEMPLATES.search_item.render(render_context);
          });
        DOM_ELEMS.SEARCH.span_query.textContent = title_query;
        DOM_ELEMS.SEARCH.ul_results.innerHTML =
          rendered_templates.join('\n');
        if (rendered_templates.length === 0) {
          DOM_ELEMS.SEARCH.span_no_results.hidden = false;
        } else {
          DOM_ELEMS.SEARCH.span_no_results.hidden = true;
        }
        // attach callbacks to fave buttons and title anchors
        Array.prototype.slice
          .call(DOM_ELEMS.SEARCH.ul_results
                .getElementsByTagName('li'))
          .forEach(attach_search_item_listeners);
        DOM_ELEMS.SEARCH.results.hidden = false;
      }, function (err) {
        impl_error("search_movies promise error: " + err.toString());
      }).finally(function () {
        // idea: wait until all images are loaded before showing the
        //       search section OR load movie data only when the
        //       details div has expanded
        show_section(SECTION_NAMES.search);
      });
  };

  var init_nav = function () {
    DOM_ELEMS.NAV.a_search.onclick = function () {
      show_section(SECTION_NAMES.search);
    };
    DOM_ELEMS.NAV.a_faves.onclick = function () {
      show_section(SECTION_NAMES.loading);
      update_faves().then(function () {
        show_section(SECTION_NAMES.faves);
      }, function (err) {
        console.log(err);
        // idea: implement a custom "modal"
        // http://getbootstrap.com/javascript/#modals-examples
        alert("error loading faves");
        show_section(SECTION_NAMES.search);
      });
    };
  };

  Object.freeze
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
  // prevents changes to an object's properties.
  // this is called "immutability."
  // many people consider immutability helpful
  // https://github.com/facebook/immutable-js#the-case-for-immutability
  // b/c it can both help programs run faster and make them easier to
  // reason about.
  // there are several libraries that offer immutable data structures
  // for javascript, including
  // mori https://github.com/swannodette/mori
  Object.freeze(SECTION_NAMES);
  // get Document Object Model elements that exist in index.html...

  // elements in the nav bar
  DOM_ELEMS.NAV = {};
  DOM_ELEMS.NAV.nav = document.getElementsByTagName('nav')[0];
  DOM_ELEMS.NAV.a_search = DOM_ELEMS.NAV.nav
    .getElementsByClassName('search')[0]
    .getElementsByTagName('a')[0];
  DOM_ELEMS.NAV.a_faves = DOM_ELEMS.NAV.nav
    .getElementsByClassName('faves')[0]
    .getElementsByTagName('a')[0];
  Object.freeze(DOM_ELEMS.NAV);
  // section elements
  DOM_ELEMS.SECTIONS = {};
  DOM_ELEMS.SECTIONS.loading = document
    .getElementById(SECTION_NAMES.loading);
  DOM_ELEMS.SECTIONS.search = document
    .getElementById(SECTION_NAMES.search);
  DOM_ELEMS.SECTIONS.faves = document
    .getElementById(SECTION_NAMES.faves);
  Object.freeze(DOM_ELEMS.SECTIONS);
  // elements in the search section
  DOM_ELEMS.SEARCH = {};
  DOM_ELEMS.SEARCH.results = DOM_ELEMS.SECTIONS.search
    .getElementsByClassName('results')[0];
  DOM_ELEMS.SEARCH.button = DOM_ELEMS.SECTIONS.search
    .getElementsByTagName('button')[0];
  DOM_ELEMS.SEARCH.input = DOM_ELEMS.SECTIONS.search
    .getElementsByTagName('input')[0];
  DOM_ELEMS.SEARCH.ul_results = DOM_ELEMS.SECTIONS.search
    .getElementsByTagName('ul')[0];
  DOM_ELEMS.SEARCH.span_query = DOM_ELEMS.SECTIONS.search
    .getElementsByClassName('query')[0];
  DOM_ELEMS.SEARCH.span_no_results = DOM_ELEMS.SECTIONS.search
    .getElementsByClassName('no-results')[0];
  Object.freeze(DOM_ELEMS.SEARCH);
  // elements in the faves section
  DOM_ELEMS.FAVES = {};
  DOM_ELEMS.FAVES.ul_faves = DOM_ELEMS.SECTIONS.faves
    .getElementsByTagName('ul')[0];
  DOM_ELEMS.FAVES.span_no_faves = DOM_ELEMS.SECTIONS.faves
    .getElementsByClassName('no-faves')[0];
  Object.freeze(DOM_ELEMS.FAVES);
  Object.freeze(DOM_ELEMS);

  DOM_ELEMS.SEARCH.button.onclick = onclick_search;

  load_templates().then(function () {
    return update_faves();
  }).then(function () {
    init_nav();
    show_section(SECTION_NAMES.search);
  });

}());
