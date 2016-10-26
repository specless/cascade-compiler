var _ = require('underscore');
var utils = require('../js/utils.js');
module.exports = function (opts) {
    opts = opts || {
        prefix: 'ad-',
        attrPrefix: 'data-'
    };
    var elements = utils.getPlugins('element');
    var attrs = utils.getPlugins('attribute');
    var cascade = utils.compilerSettings.copy();
    var normalizePath = cascade.css.normalizeDir;
    var normalize = cascade.css.normalize;
    return function (tree) {
        var dependencies = {
            css: [],
            js: [],
            jsPlugins: [],
            jsWhiteList: [],
            jsSnippets: [],
            dataSources: []
        };
        // First Process Ad Element Attributes (data-exit, data-expand, etc)
        tree.walk(function (node) {
            _.each(attrs, function (attr) {
                var attrObj, transformedEl, transformPath;
                if (node.attrs) {
                    if (_.has(node.attrs, opts.prefix + attr.name) === true) {
                        node.attrs[opts.attrPrefix + attr.newName] = node.attrs[opts.prefix + attr.name];
                        delete node.attrs[opts.prefix + attr.name];
                        attrObj = {
                            options: attr.options,
                            jsSnippets: [],
                            jsDependencies: [],
                            cssDependencies: [],
                            dataSources: [],
                            node: node
                        };
                        if (attr.transformScript) {
                            transformPath = '..' + attr.path + '/' + attr.transformScript;
                            if (require.resolve(transformPath)) {
                                delete require.cache[require.resolve(transformPath)];
                            }
                            transformedEl = require(transformPath)(attrObj, utils, _);
                        } else {
                            transformedEl = attrObj;
                        }
                        if (!attr.dependencies) {
                            attr.dependencies = {
                                css: [],
                                jsPlugins: [],
                                js: [],
                                dataSources: [],
                                jsSnippets: []
                            };
                        }
                        attr.dependencies.jsSnippets = transformedEl.jsSnippets;
                        if (transformedEl.jsDependencies.length > 0) {
                            attr.dependencies.js = attr.dependencies.js.concat(transformedEl.jsDependencies);
                        }
                        if (transformedEl.cssDependencies.length > 0) {
                            attr.dependencies.css = attr.dependencies.css.concat(transformedEl.cssDependencies);
                        }
                        if (transformedEl.dataSources.length > 0) {
                            attr.dependencies.dataSources = attr.dependencies.dataSources.concat(transformedEl.dataSources);
                        }
                        dependencies = utils.addDeps(dependencies, attr.dependencies, attr.path);
                        node = transformedEl.node;
                    }
                }
            });
            return node;
            // if (node === null) {
            //    	delete node;
            //    } else {
            //    	return node;
            //    }
        });
        // Next Process Ad Elements
        _.each(elements, function (element) {
            tree.match({
                tag: opts.prefix + element.name
            }, function (node) {
                var transformedEl, elObj, transformPath;
                node.tag = element.tag;
                if (node.attrs) {
                    node.attrs['data-element'] = element.name;
                } else {
                    node.attrs = {
                        'data-element': element.name
                    };
                }
                elObj = {
                    options: element.options,
                    jsSnippets: [],
                    jsDependencies: [],
                    cssDependencies: [],
                    dataSources: [],
                    node: node
                };
                if (element.transformScript) {
                    transformPath = '..' + element.path + '/' + element.transformScript;
                    if (require.resolve(transformPath)) {
                        delete require.cache[require.resolve(transformPath)];
                    }
                    transformedEl = require(transformPath)(elObj, utils, _);
                } else {
                    transformedEl = elObj;
                }
                if (!element.dependencies) {
                    element.dependencies = {
                        css: [],
                        jsPlugins: [],
                        js: [],
                        dataSources: [],
                        jsSnippets: []
                    };
                }
                element.dependencies.jsSnippets = transformedEl.jsSnippets;
                if (transformedEl.jsDependencies.length > 0) {
                    element.dependencies.js = element.dependencies.js.concat(transformedEl.jsDependencies);
                }
                if (transformedEl.cssDependencies.length > 0) {
                    element.dependencies.css = element.dependencies.css.concat(transformedEl.cssDependencies);
                }
                if (transformedEl.dataSources.length > 0) {
                    element.dependencies.dataSources = element.dependencies.dataSources.concat(transformedEl.dataSources);
                }
                dependencies = utils.addDeps(dependencies, element.dependencies, element.path);
                node = transformedEl.node;
            });
        });
        // Finally process all elements used that require normalization-- and insert those as css dependencies before the custom ones.
        var normalizeDeps = [];
        _.each(normalize, function (element) {
            tree.match({
                tag: element.tag
            }, function (node) {
                normalizeDeps.unshift(cascade.path + normalizePath + '/' + element.css);
                return node;
            });
        });
        dependencies.css = normalizeDeps.concat(dependencies.css);
        // console.log(dependencies);
        // utils.logComponentDetails(component, 'html', 'dependencies', dependencies);
    };
};