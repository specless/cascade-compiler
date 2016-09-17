var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
var jetpack = require('fs-jetpack');
var Handlebars = require("handlebars");
module.exports = function () {
    var cascade = utils.get('cascadeSettings');
    var project = utils.get('projectSettings');

    function transform(file, cb) {
        var settings = require('../settings');
        var userJs = String(file.contents);
        var userJsTemplate = jetpack.read(cascade.path + settings.js.templateFilePath);
        var license = jetpack.read(cascade.path + '/LICENSE');
        var component = file.relative.split('.')[0];
        // var js = [];
        // var jsPlugins = [];
        // var jsSnippets = [];
        var jsWhiteList = [];
        var comp = _.find(project.components, function (thiscomp) {
            return thiscomp.name === component;
        });
        // js = js.join('\n\n');
        // jsPlugins = jsPlugins.join('\n\n');
        // jsSnippets = jsSnippets.join('\n\n');
        license = '/*\n' + license + '\n*/';
        if (jsWhiteList.length === 0) {
            jsWhiteList = null;
        } else {
            var csfPlugins = [];
            for (var i = jsWhiteList.length; i--;) {
                var testArray = jsWhiteList[i].split("sfplugins_");
                if (testArray.length > 1) {
                    csfPlugins.push(jsWhiteList[i]);
                    jsWhiteList.splice(i, 1);
                }
            }
            csfPlugins = csfPlugins.join(',');
            jsWhiteList.push(csfPlugins);
            jsWhiteList = "'" + jsWhiteList.join("','") + "'";
        }
        var imports = [];
        userJs = userJs.replace(/import\s?[\'\"](.*)[\'\"][;\s]+?/gm, function (match_) {
            var match = match_.split('import ').join('').split('"').join('').split('\'').join('').split(';').join('');
            imports.push(match);
            return '';
        });
        var data = {
            userjs: userJs,
            // dependencies: js,
            // plugins: jsPlugins,
            // cdnscripts: jsWhiteList,
            // pluginfragments: jsSnippets,
            license: license
        };
        var mapper = {};
        utils.component(component, function (component) {
            component.imports = _.map(imports, function (mprt) {
                return mapper[mprt] ? mapper[mprt] : {
                    js: [{
                        src: mprt
                    }]
                };
            });
        });
        // if (jsSnippets) {
        //     console.error(jsSnippets);
        // }
        var jsTemplate = Handlebars.compile(userJsTemplate);
        js = jsTemplate(data);
        file.contents = new Buffer(js);
        cb(null, file);
    }
    return require('event-stream').map(transform);
};