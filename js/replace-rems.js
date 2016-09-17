var postcss = require('postcss');
var _ = require('underscore');
module.exports = postcss.plugin('replace-rems', function (opts_) {
    var opts = opts_ || {};
    // Work with options here
    return function (css_, result) {
        var css = css_;
        css.replaceValues(/\d+spx/, {
            fast: 'spx'
        }, function (string) {
            return (parseInt(string) / 100) + 'rem';
        });
    };
});