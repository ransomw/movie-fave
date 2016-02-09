/*global require, module, __dirname */

const fs = require('fs');
const path = require('path');

const Q = require('q');
const _ = require('lodash');
const fse = require('fs-extra');
const deepFreeze = require('deep-freeze');
const Handlebars = require('handlebars');
const less = require('less');
const browserify = require('browserify');
const watchify = require('watchify');
const stringify = require('stringify');

const PATHS = deepFreeze({
	src: {
		static_files: path.join(__dirname, 'static'),
		style: path.join(__dirname, 'styles', 'main.less'),
		index: path.join(__dirname, 'index.hbs'),
		js: path.join(__dirname, 'app', 'main.js')
	},
	// output paths relative to output directory,
	// the directory served static
	dest: {
		static_files: 'assets',
		index: 'index.html',
		style: 'bundle.css',
		js: 'bundle.js'
	}
});

// *utility functions*

var read_file = function (file_path) {
  var deferred = Q.defer();
  fs.readFile(file_path, 'utf8', function (err, data) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(data);
    }
  });
  return deferred.promise;
};

var write_file = function (file_path, file_str) {
  var deferred = Q.defer();
  fs.writeFile(file_path, file_str, function (err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

const do_build_step = function (fn_do_once, path_watch, cts) {
	return fn_do_once().then(function () {
		if (cts) {
			fs.watch(path_watch, {recursive: true}, () => {
				fn_do_once()
          .catch(function (err) {
            console.log("client build error");
            console.log(err);
          });
			});
		}
	});
};

// *build steps*

const copy_static_files = function (dir_output, opt_args) {
	var opts = opt_args || {};
	const path_src = PATHS.src.static_files;
	const do_once = function () {
		var deferred = Q.defer();
		fse.copy(path_src, dir_output, (err) => {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve();
			}
		});
		return deferred.promise;
	};
	return do_build_step(do_once, path_src, opts.cts);
};

const build_index = function (path_output, url_static, opt_args) {
	var opts = opt_args || {};
	const path_src = PATHS.src.index;
	const do_once = function () {
		return read_file(path_src)
			.then(function (template_str) {
				var template = Handlebars.compile(template_str);
				var html_str = template({});
				return write_file(path_output, html_str);
			});
	};
	return do_build_step(do_once, path_src, opts.cts);
};

const build_styles = function (path_output, opt_args) {
	var opts = opt_args || {};
  const path_src_file = PATHS.src.style;
	const dir_src = path.dirname(path_src_file);
	const do_once = function () {
    return read_file(path_src_file)
      .then(function (str_less_input) {
        return less.render(str_less_input, {
          paths: [
            dir_src,
            path.join(dir_src, 'vendor')
          ]
        });
      }).then(function (less_output) {
        var str_css = less_output.css;
        var str_sourcemap = less_output.sourcemap;
        var arr_imports = less_output.imports;
        return write_file(path_output, str_css);
      });
	};
  return do_build_step(do_once, dir_src, opts.cts);
};

const build_js = function (path_output, opt_args) {
	var opts = opt_args || {};
	const make_write_bundle = function (bfy, path_bundle) {
		return function () {
			var deferred = Q.defer();
			var stream_bundle = bfy.bundle();
			stream_bundle.pipe(fs.createWriteStream(path_bundle));
			stream_bundle.on('end', function () {
				deferred.resolve();
			});
			return deferred.promise;
		};
	};
	const bfy = browserify({
    entries: [PATHS.src.js],
    cache: {},
    packageCache: {},
    debug: true, // source maps
    plugin: opts.cts ? [watchify] : [],
    transform: [stringify(['.html'])]
  });
  var write_bundle = make_write_bundle(bfy, path_output);
  if (opts.cts) {
    bfy.on('update', write_bundle);
  }
  return write_bundle();
};

// *public interface*

// opt_args:
//  - cts: continuous build rebuilds on file changes
const build_client = function (dir_output, url_static, opt_args) {
	var opts = opt_args || {};
	// clean before every build
  if (fs.existsSync(dir_output)) {
    fse.removeSync(dir_output);
  }
	fse.ensureDirSync(dir_output);
	return Q.all([
		copy_static_files(
			path.join(dir_output, PATHS.dest.static_files),
			_.pick(opts, ['cts'])),
		build_index(
			path.join(dir_output, PATHS.dest.index),
			url_static,
			_.pick(opts, ['cts'])),
		build_styles(
			path.join(dir_output, PATHS.dest.style),
			_.pick(opts, ['cts'])),
		build_js(
			path.join(dir_output, PATHS.dest.js),
			_.pick(opts, ['cts']))
	]);
};

var exports = {};

exports.build_client = build_client;

module.exports = exports;
