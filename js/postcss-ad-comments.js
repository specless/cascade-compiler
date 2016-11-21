var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
module.exports = postcss.plugin('breakpoints', function (opts_) {
    return function (root) {
        root.replaceValues(/\/\/[\w\s\']*/igm, {
            fast: '//'
        }, function (string) {
            console.log(string);
            return '';
        });
    };
});