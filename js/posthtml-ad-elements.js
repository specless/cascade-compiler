var _ = require('underscore');
var utils = require('../js/utils.js');
var path = require('path');
module.exports = function (opts_) {
    var opts = opts_ || {
        prefix: 'ad-',
        attrPrefix: 'data-'
    };
    var cascade = utils.compilerSettings.copy();
    var normalizePath = cascade.css.normalizeDir;
    var normalize = cascade.css.normalize;
    var fillUrl = function (asset, type, identifier) {
        var where = asset[assetUrlLocations[type]];
        if (!where) {
            return asset;
        }
        if (where.slice(0, 4) === 'http') {
            return asset;
        }
        asset[assetUrlLocations[type]] = path.join('plugins/', identifier, where);
        return asset;
    };
    var assetUrlLocations = {
        js: "src",
        css: "href"
    };
    var createImports = function (plugin_, tree_) {
        var plugin = plugin_,
            identifier = plugin && (plugin.id || plugin.name),
            company = plugin && plugin.company || 'specless',
            dependencies = plugin && plugin.dependencies,
            assets = plugin && plugin.assets;
        return !dependencies ? [] : _.map(dependencies.defaults, function (imprt) {
            return _.foldl(imprt, function (memo, list, type) {
                var typeHash = assets && assets[type];
                memo[type] = _.foldl(list, function (memo, item) {
                    var asset;
                    if (_.isObject(item)) {
                        asset = JSON.parse(JSON.stringify(item));
                    } else if (typeHash[item]) {
                        asset = JSON.parse(JSON.stringify(typeHash[item]));
                    } else if (item === 'index') {
                        asset = {
                            src: '/',
                            id: 'index-js'
                        };
                    }
                    if (asset) {
                        if (!asset.id) {
                            asset.id = item;
                        }
                        memo.push(asset);
                        fillUrl(asset, type, identifier);
                        asset.id = identifier + '-' + type + '-' + asset.id;
                    }
                    return memo;
                }, memo[type] || []);
                return memo;
            }, {});
        });
    };
    return function (tree) {
        var elements, attrs,
            imports = [],
            setsVars = _.once(function () {
                elements = utils.getPlugins();
            });
        var findPlugin = function (tag) {
            setsVars();
            return _.find(elements, function (element) {
                return element.tag === tag;
            });
        };
        tree.walk(function (node) {
            var found;
            if (!_.isObject(node)) {
                return;
            }
            // validation. can be made custom per component
            if (node.tag.slice(0, 3) !== 'ad-') {
                return node;
            }
            var plugin = findPlugin(node.tag);
            var imprts = createImports(plugin);
            imports = imports.concat(imprts);
            return node;
        });
        utils.addImports(opts.component, imports);
        // var dependencies = {
        //     css: [],
        //     js: [],
        //     jsPlugins: [],
        //     jsWhiteList: [],
        //     jsSnippets: [],
        //     dataSources: []
        // };
        // // First Process Ad Element Attributes (data-exit, data-expand, etc)
        // tree.walk(function (node) {
        //     _.each(attrs, function (attr) {
        //         var attrObj, transformedEl, transformPath;
        //         if (node.attrs) {
        //             if (_.has(node.attrs, opts.prefix + attr.name) === true) {
        //                 node.attrs[opts.attrPrefix + attr.newName] = node.attrs[opts.prefix + attr.name];
        //                 delete node.attrs[opts.prefix + attr.name];
        //                 attrObj = {
        //                     options: attr.options,
        //                     jsSnippets: [],
        //                     jsDependencies: [],
        //                     cssDependencies: [],
        //                     dataSources: [],
        //                     node: node
        //                 };
        //                 if (attr.transformScript) {
        //                     transformPath = '..' + attr.path + '/' + attr.transformScript;
        //                     if (require.resolve(transformPath)) {
        //                         delete require.cache[require.resolve(transformPath)];
        //                     }
        //                     transformedEl = require(transformPath)(attrObj, utils, _);
        //                 } else {
        //                     transformedEl = attrObj;
        //                 }
        //                 if (!attr.dependencies) {
        //                     attr.dependencies = {
        //                         css: [],
        //                         jsPlugins: [],
        //                         js: [],
        //                         dataSources: [],
        //                         jsSnippets: []
        //                     };
        //                 }
        //                 attr.dependencies.jsSnippets = transformedEl.jsSnippets;
        //                 if (transformedEl.jsDependencies.length > 0) {
        //                     attr.dependencies.js = attr.dependencies.js.concat(transformedEl.jsDependencies);
        //                 }
        //                 if (transformedEl.cssDependencies.length > 0) {
        //                     attr.dependencies.css = attr.dependencies.css.concat(transformedEl.cssDependencies);
        //                 }
        //                 if (transformedEl.dataSources.length > 0) {
        //                     attr.dependencies.dataSources = attr.dependencies.dataSources.concat(transformedEl.dataSources);
        //                 }
        //                 dependencies = utils.addDeps(dependencies, attr.dependencies, attr.path);
        //                 node = transformedEl.node;
        //             }
        //         }
        //     });
        //     return node;
        //     // if (node === null) {
        //     //       delete node;
        //     //    } else {
        //     //       return node;
        //     //    }
        // });
        // Next Process Ad Elements
        // console.log(elements);
        // _.each(elements, function (element) {
        // tree.match({
        //     tag: opts.prefix + element.name
        // }, function (node) {
        //     var transformedEl, elObj, transformPath;
        //     node.tag = element.tag;
        //     if (node.attrs) {
        //         node.attrs['data-element'] = element.name;
        //     } else {
        //         node.attrs = {
        //             'data-element': element.name
        //         };
        //     }
        //     elObj = {
        //         options: element.options,
        //         jsSnippets: [],
        //         jsDependencies: [],
        //         cssDependencies: [],
        //         dataSources: [],
        //         node: node
        //     };
        //     console.log(element);
        //     if (element.transformScript) {
        //         transformPath = '..' + element.path + '/' + element.transformScript;
        //         if (require.resolve(transformPath)) {
        //             delete require.cache[require.resolve(transformPath)];
        //         }
        //         transformedEl = require(transformPath)(elObj, utils, _);
        //     } else {
        //         transformedEl = elObj;
        //     }
        //     if (!element.dependencies) {
        //         element.dependencies = {
        //             css: [],
        //             jsPlugins: [],
        //             js: [],
        //             dataSources: [],
        //             jsSnippets: []
        //         };
        //     }
        //     element.dependencies.jsSnippets = transformedEl.jsSnippets;
        //     if (transformedEl.jsDependencies.length > 0) {
        //         element.dependencies.js = element.dependencies.js.concat(transformedEl.jsDependencies);
        //     }
        //     if (transformedEl.cssDependencies.length > 0) {
        //         element.dependencies.css = element.dependencies.css.concat(transformedEl.cssDependencies);
        //     }
        //     if (transformedEl.dataSources.length > 0) {
        //         element.dependencies.dataSources = element.dependencies.dataSources.concat(transformedEl.dataSources);
        //     }
        //     dependencies = utils.addDeps(dependencies, element.dependencies, element.path);
        //     node = transformedEl.node;
        // });
        // });
        // Finally process all elements used that require normalization-- and insert those as css dependencies before the custom ones.
        // var normalizeDeps = [];
        // console.log(normalize);
        // _.each(normalize, function (element) {
        //     tree.match({
        //         tag: element.tag
        //     }, function (node) {
        //         normalizeDeps.unshift(cascade.path + normalizePath + '/' + element.css);
        //         return node;
        //     });
        // });
        // dependencies.css = normalizeDeps.concat(dependencies.css);
        // console.log(dependencies);
        // utils.logComponentDetails(component, 'html', 'dependencies', dependencies);
    };
};
