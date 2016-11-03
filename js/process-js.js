var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
var jetpack = require('fs-jetpack');
var Handlebars = require("handlebars");
var collectImports = function (userJs, imports) {
    return userJs.replace(/import\s?[\'\"](.*)[\'\"][;\s]+?/gm, function (match_) {
        var match = match_.split('import ').join('').split('"').join('').split('\'').join('').split(';').join('');
        imports.push(match);
        return '';
    });
};
module.exports = function () {
    function transform(file, cb) {
        var cascade = require('../settings');
        var project = utils.projectSettings.get('components');
        var userJs = String(file.contents);
        var license = jetpack.read(cascade.path + '/LICENSE');
        var component = file.relative.split('.')[0];
        license = '/*\n' + license + '\n*/';
        var imports = [];
        userJs = collectImports(userJs, imports);
        // known js shortcuts
        var mapper = function () {};
        utils.addImports(component, _.map(imports, function (mprt) {
            var imprt;
            return (imprt = mapper(mprt)) ? imprt : {
                js: [{
                    src: mprt
                }]
            };
        }));
        file.contents = new Buffer(license + '\n' + userJs);
        cb(null, file);
    }
    return require('event-stream').map(transform);
};