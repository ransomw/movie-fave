/*global process, require */

// ES6 adds a const(ant) declaration for immutable variables
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
// note in particular that an (unfrozen) object with a `const`
// declaration still has mutable properties, as demonstrated
// by mutating `app.locals` below
//
// frontend compatibility is Chrome >= 21, Firefox >= 36, IE >= 11
const execFile = require('child_process').execFile;
const fs = require('fs');

const Q = require('q');
const tape = require('tape');
const tap_spec = require('tap-spec');
const webdriverio = require('webdriverio');
const tmp = require('tmp');
const deepFreeze = require('deep-freeze');
const _ = require('lodash');
const jsdom = require('jsdom');
const cheerio = require('cheerio');

const make_app = require('../../no_libs/server');
const client_marionette = require('../../marionette');

const G_CONST = require('../../index').CONST;
// path to chromedriver executable
const CD_PATH = require('chromedriver').path;
// webdriver port.
// https://www.w3.org/TR/webdriver/
const WD_PORT = 7999;
// application port
const APP_PORT = process.env.PORT || 5000;
const APP_URL = 'http://localhost:' + APP_PORT;
const PAGELOAD_TIMEOUT = 10000; // ms
const TEST_DATA = deepFreeze(require('./test_data.json'));

// webdriver process, a `ChildProcess` object
// https://nodejs.org/api/child_process.html#child_process_class_childprocess
var wd_proc;
// webdriver client instance
var client = webdriverio.remote({
  host: 'localhost',
  port: WD_PORT,
  desiredCapabilities: { browserName: 'chrome' }
});
// returned by `tmp` module
// https://github.com/raszi/node-tmp
var data_file;
// application instance
var app = make_app();
// application http server instance
// https://nodejs.org/api/http.html#http_class_http_server
var app_server;

/* todo: use page object pattern or otherwise...
 *       tests are too dependent of specific selectors
 *       (e.g. expects .details div, not .view-details div
 */

/* todo: break up this function into smaller pieces
 */
// pass to webdriverio client's .waitUntil
// note that this is application-specific: it waits until css spinners
// aren't visible.
// there's no "standard" method (that i'm aware of?) to determine
// if a single-page app has loaded for webdriver testing.
const wait_until_load = function () {
  return this.elements("[class*='spin-']") // spinner elements
    .then(function (res) {
      var self = this;
      if (!res.value) {
        return [];
      }
			/* todo: abstract this isVisible by id into seperate function */
      return Q.all(res.value.map(function (el) {
        return Q.all([
          self.elementIdLocationInView(el.ELEMENT),
          self.elementIdSize(el.ELEMENT),
          self.elementIdDisplayed(el.ELEMENT),
          self.elementIdAttribute(el.ELEMENT, 'class')
        ])
          .spread(function (loc, size, disp, cls) {
            return {location: loc.value,
                    size: {
                      h: size.value.height,
                      w: size.value.width},
                    disp: disp.value,
                    cls: cls.value // for debug
                   };
          })
          .catch(function (err) {
            return null;
          });
      }));
    }).then(function (el_infos) {
      var is_visible_el_info = function (el_info) {
        if (el_info === null) {
          return false; // stale WebElement, wait some more
        }
        return (el_info.size.h === 0 && el_info.size.w === 0 &&
                el_info.location.x === 0 && el_info.location.y === 0) ||
          !el_info.disp;

      };
      var el_info_visibilities = el_infos.map(is_visible_el_info);
      return el_info_visibilities
        .reduce(function (a, b) {
          return a && b;
        }, true);
    });
};

const func_test_setup = function (t) {
  data_file = tmp.fileSync();
  // node `fs` module supports identification by path or File Descriptor
  fs.writeFileSync(data_file.fd, '[]');
  app.locals.path_data_file = data_file.name;
  Q().then(function () {
    var deferred = Q.defer();
    app_server = app.listen(APP_PORT, function () {
      deferred.resolve();
    });
    app_server.on('error', (err) => {
      deferred.reject(err);
    });
    return deferred.promise;
  }).then(function () {
    return client.init();
  }).catch(function (err) {
    t.notOk(err, "setup with no errors");
  }).finally(function () {
    t.end();
  });
};

const func_test_teardown = function (t) {
  Q().then(function () {
    return client.end();
  }).then(function () {
    var deferred = Q.defer();
    app_server.close((err) => {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve();
      }
    });
    return deferred.promise;
  }).then(function () {
    fs.closeSync(data_file.fd);
    fs.unlinkSync(data_file.name);
  }).catch(function (err) {
    t.notOk(err, "teardown with no errors");
  }).finally(function () {
    t.end();
  });
};

// *navigation*
// abstract navigation with functions

const nav_home = function () {
  return Q().then(function () {
    return client.url(APP_URL)
      .waitUntil(wait_until_load, PAGELOAD_TIMEOUT);
  });
};

const _make_nav_fn = function (sel_nav) {
  return function () {
		var try_nav_click = function () {
			return Q().then(function () {
  			return client.element(sel_nav);
  		}).then(function (res_el) {
				return client.elementIdClick(res_el.value.ELEMENT);
  		});
		};

		return Q().then(function () {
			return try_nav_click();
		}).catch(function (err) {
  		if (err.seleniumStack &&
  				err.seleniumStack.type === 'NoSuchElement') {
  			return nav_home();
  		} else {
  			throw err;
  		}
  	}).then(function () {
			return try_nav_click();
		});
  };
};

const nav_search = _make_nav_fn('nav .search a');
const nav_faves = _make_nav_fn('nav .faves a');

const _search_movies = function () {
  return nav_search().then(function () {
    const sel_input = '#search form > input';
    return client.clearElement(sel_input)
      .setValue(sel_input, TEST_DATA.title_search)
      .click('#search form > button')
      .waitUntil(wait_until_load, PAGELOAD_TIMEOUT);
  });
};

// *tests*

const _test_fave = function (t) {

	/* todo: abstract duplicate functionality between here and
	 * test_search_items
	 */
	const add_fave = function () {
		const sel_li_res = '#search .results li';
    var get_els_ids = function () {
  		return Q().then(function () {
				return Q.all([
  				client.elements(sel_li_res + ' .summary a'),
  				client.elements(sel_li_res + ' button')
  			]);
			}).spread(function (res_a_title, res_button) {
				t.equal(res_a_title.value.length, res_button.value.length,
								"same number of titles and fave buttons");
  			return _.zip(res_a_title.value, res_button.value)
  				.map((item_vals) => {
  					return _.zipObject(
  						['title', 'button'],
  						item_vals.map((item_val) => item_val.ELEMENT));
  				});
  		});
  	};
		const get_titles = function () {
			return get_els_ids().then(function (els_ids) {
				return Q.all(els_ids.map(function (el_ids) {
					return Q().then(function () {
						return client.elementIdText(el_ids.title);
					}).then(function (res) {
						return res.value;
					});
				}));
			});
		};
		var get_title_btn_id_objs = function () {
			return Q.all(
				[get_els_ids(), get_titles()]
			).spread(function (els_ids, titles) {
				return _.zipObject(titles,
													 els_ids.map((el_ids) => el_ids.button));
			});
		};
		var get_id_fave_btn = function () {
			return Q().then(function () {
				return get_title_btn_id_objs();
			}).then(function (obj_titles_btn_ids) {
				var id_fave_btn = obj_titles_btn_ids[TEST_DATA.title_fave];
				t.ok(id_fave_btn, "found button for favorite title");
				return id_fave_btn;
			});
		};

		return Q().then(function () {
			return get_id_fave_btn();
		}).then(function (id_fave_btn) {
			return client.elementIdClick(id_fave_btn)
				.waitUntil(wait_until_load, PAGELOAD_TIMEOUT);
		}).then(function () {
			/* todo: make certain fave button is hidden
			 *       see also todo in wait_until_load
			 */
			return nav_faves();
		}).then(function () {
			return client.getText('#faves li .summary a');
		}).then(function (str_title) {
			t.equal(str_title, TEST_DATA.title_fave,
							"favorite title appears on faves list");
		});
	};

	nav_faves().then(function () {
		return client.isVisible('#faves .no-faves');
	}).then(function (is_vis_no_faves) {
		t.ok(is_vis_no_faves,
				 "no favorites message visible before adding faves");
		return _search_movies();
	}).then(function () {
		return add_fave();
	}).then(function () {
  	/* todo: more thorough tests of faves page behavior
  	 *       ... has data, title clicks, etc.
  	 */
		t.end();
	});
};

const test_fave = function (t) {
  t.test("setup", func_test_setup);
  t.test("test", _test_fave);
  t.test("teardown", func_test_teardown);
	t.end();
};


const _test_search = function (t) {

	const test_search_item = function (el_ids) {
		return Q().then(function () {
			return Q.all([
        client.elementIdDisplayed(el_ids.details),
        client.elementIdText(el_ids.details)
      ]);
		}).spread(function (res_disp, res_text) {
			t.equal(res_text.value, '',
              "details hidden after search");
			return client.elementIdClick(el_ids.title);
		}).then(function () {
			return Q.all([
        client.elementIdDisplayed(el_ids.details),
        client.elementIdText(el_ids.details)
      ]);
		}).spread(function (res_disp, res_text) {
      t.notEqual(res_text.value, '',
                 "details visible after title click");
			return client.elementIdClick(el_ids.title);
		}).then(function () {
			return Q.all([
        client.elementIdDisplayed(el_ids.details),
        client.elementIdText(el_ids.details)
      ]);
		}).spread(function (res_disp, res_text) {
			t.equal(res_text.value, '',
              "details hidden after second title click");
		});
	};

  const test_search_items = function () {
		const sel_li_res = '#search .results li';
    var promise_els_ids = Q().then(function () {
      return Q.all([
				client.elements(sel_li_res),
				client.elements(sel_li_res + ' .summary a'),
				client.elements(sel_li_res + ' .details'),
        client.elements(sel_li_res + ' .view-details')
			]);
    }).spread(function (res_li, res_a_title, res_details,
                        res_details_view) {
      var details_value;
      if (res_details.value.length === 0) {
        // marionette client
        details_value = res_details_view.value;
      } else {
        details_value = res_details.value;
      }
			t.equal(res_a_title.value.length, res_li.value.length,
							"as many title anchors as list items");
			t.equal(details_value.length, res_li.value.length,
							"as many detail divs as list items");
			return _.zip(res_li.value, res_a_title.value, details_value)
				.map((item_vals) => {
					return _.zipObject(
						['li', 'title', 'details'],
						item_vals.map((item_val) => item_val.ELEMENT));
				});
		});
		return promise_els_ids.then(function (els_ids) {
			return Q.all(els_ids.slice(0, 1)
									 .map((el_ids) => test_search_item(el_ids)));
		});
  };

	var test_search_data = function () {
		// ensure that all data is in place
  		return Q().then(function () {
  			return client.getHTML('#search .results ul');
  		}).then(function (str_results_ul_html) {
  			const desired_titles = deepFreeze(TEST_DATA.search_results
  																				.map((res) => res.title));
  			var ul_results = jsdom.jsdom(str_results_ul_html);
  			var arr_li_result = Array.prototype.slice
  						.call(ul_results.getElementsByTagName('li'));
  			var results_data = arr_li_result.map((li_result) => {
  				var cel_li = cheerio.load(li_result.outerHTML);
  				return {
  					title: cel_li('.summary a').text(),
  					date: cel_li('.summary span').text()
  						.replace(/\(([0-9]+)\)/, '$1'),
  					img_url: cel_li('.details img').attr('src'),
  					summary: cel_li('.details p').text().trim()
  				};
  			});
  			var desired_results_data = results_data.filter((res) => {
  				return desired_titles.indexOf(res.title) !== -1;
  			});
        var checked_data_fields = ['title', 'date'];
  			t.deepEqual(_.difference(desired_titles, results_data
  															 .map((res) => res.title)), [],
  									"has all expected titles");
        // marionette client dynamically loads title and movie data
  			t.deepEqual(
          desired_results_data.map(function (d_pt) {
            return _.pick(d_pt, checked_data_fields);
          }),
          TEST_DATA.search_results.map(function (d_pt) {
            return _.pick(d_pt, checked_data_fields);
          }),
  				"has expected search results data");
  		});
	};

	_search_movies().then(function () {

    console.log("calling test_search_data");

    return test_search_data();
  }).then(function () {

    console.log("calling test_search_items");

    return test_search_items();
  }).catch(function (err) {
    t.notOk(err, "search test with no errors");
  }).finally(function () {
    t.end();
  });
};

const test_search = function (t) {
  t.test("setup", func_test_setup);
  t.test("test", _test_search);
  t.test("teardown", func_test_teardown);
	t.end();
};


const _test_home = function (t) {
  nav_home().then(function () {
    return client.getTitle();
  }).then(function (title) {
    t.equal(title, 'Movie Fave', "displays page title");
  }).catch(function (err) {
    t.notOk(err, "homepage test with no errors");
  }).finally(function () {
    t.end();
  });
};

const test_home = function (t) {
  t.test("setup", func_test_setup);
  t.test("test", _test_home);
  t.test("teardown", func_test_teardown);
	t.end();
};

const func_tests_setup = function (t) {
  wd_proc = execFile(
    CD_PATH, ['--url-base=/wd/hub',
              '--port=' + WD_PORT.toString()]);
  t.ok(wd_proc.pid, "browser process started");
  t.end();
};

const func_tests_teardown = function (t) {
  var close_signal = 'SIGTERM'; // default arg for ChildProcess.kill()
  /* close_signal = 'SIGINT'; */
  close_signal = 'SIGKILL';
  t.plan(2);
  t.ok(wd_proc.pid, "webdriver process running");
  wd_proc.on(
    'exit',
    // this is an "arrow function"
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
    // which is, in part, a form of "syntactic sugar"
    // https://en.wikipedia.org/wiki/Syntactic_sugar
    // introduced in the ES6 standard for anonymous functions.
    // it's slightly more than sugar b/c, for instance, `this`
    // and `arguments` are not bound as in the ES5
    // anonymous function syntax
    (code, signal) => {
      t.equal(signal, close_signal,
              "webdriver process exit on expected signal");
      /* t.end(); */
    });
  wd_proc.kill(close_signal);
};

const func_tests = function (t) {
  t.test("setup functional tests", func_tests_setup);
  t.test("displays homepage", test_home);
  t.test("search movies", test_search);
	t.test("add favorite", test_fave);
  t.test("teardown functional tests", func_tests_teardown);
  // t.ok(true, "placeholder");
  t.end();
};

/* todo: pass config option, incl.
 *       - chromedriver port
 *       - select browser (phantom, slimer, etc.)
 */
const run_tests = function (frontend_client) {
  const DIR_MARIONETTE_CLIENT = G_CONST.DIR_MARIONETTE_CLIENT;
  var promise_client_build = Q();
  if (frontend_client === G_CONST.CLIENT_TYPES.marionette) {
    app = make_app({dir_client: DIR_MARIONETTE_CLIENT});
    promise_client_build = 	Q().then(function () {
		  // default static url duplicated from server.js defaults
		  return client_marionette.build_client(
			  DIR_MARIONETTE_CLIENT, '/', {cts: false});
	  });
  }
  return promise_client_build.then(function () {
    var deferred = Q.defer();
    tape.createStream()
      .pipe(tap_spec())
      .pipe(process.stdout);
    tape.test("functional tests", func_tests);
    tape.onFinish(function () {
      deferred.resolve();
    });
    return deferred.promise;
  });
};

tmp.setGracefulCleanup();

module.exports = run_tests;
