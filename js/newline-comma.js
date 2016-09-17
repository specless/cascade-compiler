var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
module.exports = postcss.plugin('newline-comma', function (opts) {
    return function (css, result) {
        css.walkRules(function (rule) {
            rule.selector = rule.selector.replace(/\,\s?/gm, ',\n');
        });
    };
});