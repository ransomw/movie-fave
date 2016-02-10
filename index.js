/*global require, module, __dirname */

const path = require('path');

const deepFreeze = require('deep-freeze');


const DIR_REPO = path.join(__dirname, '..');
const DIR_NO_LIBS_CLIENT = path.join(DIR_REPO, 'no_libs', 'public');
const DIR_MARIONETTE_CLIENT = path.join(DIR_REPO, 'build', 'marionette');
const CLIENT_TYPES = deepFreeze({
	no_libs: "no-libs",
	marionette: "marionette"
});

const CONST = {
  DIR_REPO: DIR_REPO,
  DIR_NO_LIBS_CLIENT: DIR_NO_LIBS_CLIENT,
  DIR_MARIONETTE_CLIENT: DIR_MARIONETTE_CLIENT,
  CLIENT_TYPES: CLIENT_TYPES
};

var exports = {};

exports.CONST = CONST;

module.exports = exports;

