var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var jetpack = require('fs-jetpack');
var colors = require('colors');
var directoryTree = require('directory-tree').directoryTree;
var globalSettings = jetpack.read('./package.json', 'json');
// var compilerSettings = globalSettings['specless-cascade'];
var compilerSettings = require(path.join(process.cwd(), 'settings/index.json'));
var stripSync = require("strip-css-singleline-comments/sync");
var settings = require('../settings');
var projectSettings = {};
var deepExtend = _.deepExtend = function (target_, source) {
    var target = target_;
    if (!target) {
        target = {};
    }
    _.each(source, function (value, prop) {
        if (_.isObject(target[prop]) && !Array.isArray(target[prop])) {
            deepExtend(target[prop], value);
        } else {
            target[prop] = value;
        }
    });
    return target;
};
module.exports = {
    // currentProject: ,
    projectSettings: {
        folder: function () {
            if (compilerSettings.currentProjectDir === 'default') {
                return compilerSettings.path + compilerSettings.defaultProjectDir;
            } else {
                return compilerSettings.currentProjectDir;
            }
        },
        buildDir: function () {
            return '.output/';
        },
        settings: function () {
            return path.join(this.folder(), compilerSettings.settingsFileName);
        },
        get: function (key) {
            return projectSettings[key];
        },
        remove: function (key) {
            delete projectSettings[key];
        },
        copy: function () {
            return JSON.parse(JSON.stringify(projectSettings));
        },
        set: function (extension) {
            extension.lastUpdated = new Date();
            _.extend(projectSettings, extension);
        },
        read: function () {
            var settings = jetpack.read(this.settings(), 'json');
            projectSettings = {
                name: settings.name,
                lastUpdated: settings.lastUpdated
            };
        },
        write: function () {
            jetpack.write(this.settings(), projectSettings);
        },
        allFiles: function () {
            return [path.join(this.folder(), '/**/*'), path.join('!', this.folder(), '/{', this.buildDir(), ',', this.buildDir(), '/**}')];
        }
    },
    compilerSettings: {
        get: function (key) {
            return compilerSettings[key];
        },
        copy: function () {
            return JSON.parse(JSON.stringify(compilerSettings));
        },
        set: function (extension) {
            _.extend(compilerSettings, extension);
            this.write();
        },
        file: function () {
            return './settings/index.json';
        },
        read: function () {
            compilerSettings = jetpack.read(this.file(), 'json');
        },
        write: function () {
            jetpack.write(this.file(), compilerSettings);
        }
    },
    component: function (component, fn) {
        var settings = this.projectSettings.copy();
        var components = settings.components || [];
        if (component === 'src') {
            return {};
        }
        var foundComponent = _.find(settings.components, function (com) {
            return com.name === component;
        });
        if (!foundComponent) {
            foundComponent = {
                name: component,
                imports: []
            };
            components.push(foundComponent);
        }
        if (fn) {
            fn(foundComponent);
            this.projectSettings.set({
                components: components
            });
        }
        return foundComponent;
    },
    addImports: function (component, _imports) {
        var imports = _imports || [];
        this.component(component, function (component) {
            var sanitized = component.imports || [];
            _.each(imports, function (imprt) {
                if (_.find(sanitized, function (imported) {
                        return _.isEqual(imported, imprt);
                    })) {
                    return;
                }
                sanitized.push(JSON.parse(JSON.stringify(imprt)));
            });
            component.imports = sanitized;
        });
    },
    dumpSettings: function (dump) {
        var components = this.projectSettings.copy().components;
        _.each(dump && dump.components, function (data, key) {
            var com = _.find(components, function (com) {
                return com.name === key;
            });
            if (!components) {
                components = [];
            }
            if (!com) {
                com = {
                    name: key
                };
                components.push(com);
            }
            _.extend(com, data);
        });
        dump.components = components;
        this.projectSettings.set(dump);
    },
    makeComponent: function (dump, com) {
        var components = dump.components = dump.components || {};
        var comp = components[com] = components[com] || {};
        return comp;
    },
    logComponentDetails: function (component_name, sourceType, logAs, value) {
        this.component(component_name, function (component) {
            component[sourceType][logAs] = value;
        });
    },
    timestamp: function () {
        return new Date();
    },
    openProject: function (path, callback) {
        var folder, settings, cascade;
        if (this.validateProject(path) === true) {
            // settings = this.get('projectSettings');
            // settings = this.projectSettings.copy();
            cascade = this.compilerSettings.copy();
            folder = this.projectSettings.folder();
            this.projectSettings.set({
                // currentProjectDir: path,
                // path: folder,
                name: folder.split('/').pop()
            });
            // settings.path = this.projectSettings.folder();
            // settings.name = this.projectSettings.folder().split('/').pop();
            // this.projectSettings.set(settings);
            if (callback) {
                callback(true);
            }
        } else {
            this.logError('Error opening this project', "The project located at '" + path + "' is not a valid Specless Cascade project. Default project opened instead.");
            this.projectSettings.set({
                currentProjectDir: compilerSettings.path + compilerSettings.defaultProjectDir
            });
            if (callback) {
                callback(false);
            }
        }
    },
    validateProject: function (path) {
        var directory = directoryTree(path);
        var project = this.projectSettings.copy();
        var cascade = this.compilerSettings.copy();
        // Check for an assets folder, settings file and at least one component;
        var hasAssets;
        var hasSettings;
        var components = [];
        var assetsDir = compilerSettings.assetsDirName;
        var componentHtml = compilerSettings.html.fileName;
        var componentCss = compilerSettings.css.fileName;
        var componentJs = settings.js.fileName;
        var settingsPath = compilerSettings.settingsFileName;
        try {
            _.each(directory.children, function (child) {
                var hasHtml, hasCss, hasJs, oldPath, newPath, cssFile;
                if (child.name === assetsDir && child.type === "directory") {
                    hasAssets = true;
                } else if (child.type === "directory") {
                    // Check if this is a component
                    _.each(child.children, function (file) {
                        var oldPath, newPath, endOfLine, cssFile;
                        if (file.name === componentHtml) {
                            hasHtml = true;
                        } else if (file.name === componentCss) {
                            hasCss = true;
                        } else if (file.name === componentJs) {
                            hasJs = true;
                        } else if (file.name === "index.scss") {
                            oldPath = path + '/' + file.path;
                            newPath = path + '/' + file.path.replace('.scss', '.css');
                            fs.renameSync(oldPath, newPath);
                            endOfLine = require('os').EOL;
                            cssFile = jetpack.read(newPath);
                            cssFile = "@import 'global-styles';" + endOfLine + cssFile;
                            // Do something here to replace inline comments with CSS comments.
                            jetpack.write(newPath, cssFile);
                            hasCss = true;
                        }
                    });
                    if (hasHtml === true && hasCss === true && hasJs === true) {
                        var component = {
                            name: child.name,
                            plugins: [],
                            assets: {}
                        };
                        components.push(component);
                    }
                } else if (child.type === "file" && child.name === settingsPath) {
                    hasSettings = true;
                } else if (child.name === "_global.scss") {
                    oldPath = path + '/' + child.path;
                    newPath = path + '/' + child.path.replace('_global.scss', compilerSettings.css.globalFileName);
                    fs.renameSync(oldPath, newPath);
                    cssFile = jetpack.read(newPath);
                    cssFile = cssFile.replace('// Define Global Variables', '');
                    jetpack.write(newPath, cssFile);
                } else if (child.name === "_settings.json") {
                    oldPath = path + '/' + child.path;
                    newPath = path + '/' + child.path.replace('_settings.json', 'OLD_settings.json');
                    fs.renameSync(oldPath, newPath);
                }
            });
        } catch (error) {
            console.error(error);
            return false;
        }
        if (hasAssets === true && components.length > 0) {
            return true;
        } else {
            return false;
        }
    },
    logError: function (title, message) {
        console.log('');
        console.log(colors.red.bold(title));
        console.log(colors.black.bold('ERROR MESSAGE:'));
        console.log(message);
        console.log('');
    },
    copyToPublishFolder: function () {
        var project = this.projectSettings.copy();
        var cascade = this.compilerSettings.copy();
        var folder = this.projectSettings.folder();
        _.each(project.components, function (component) {
            jetpack.copy(project.path, compilerSettings.publishDir, {
                overwrite: 'yes'
            });
            var htmlFile = jetpack.read(folder + compilerSettings.buildDir + '/' + component.name + '/' + compilerSettings.html.fileName);
            var cssFile = jetpack.read(folder + compilerSettings.buildDir + '/' + component.name + '/' + compilerSettings.css.fileName);
            var jsFile = jetpack.read(folder + compilerSettings.buildDir + '/' + component.name + '/' + compilerSettings.js.fileName);
            jetpack.write(folder + compilerSettings.publishDir + '/' + compilerSettings.publishCompiledDirName + '/' + component.name + '.html', htmlFile);
            jetpack.write(folder + compilerSettings.publishDir + '/' + compilerSettings.publishCompiledDirName + '/' + component.name + '.css', cssFile);
            jetpack.write(folder + compilerSettings.publishDir + '/' + compilerSettings.publishCompiledDirName + '/' + component.name + '.js', jsFile);
        });
    },
    sendMessage: function (message, details, code) {
        var messageLog = jetpack.read('./message-log.json', 'json') || [];
        var obj = {
            message: message,
            code: code,
            details: details
        };
        messageLog.push(obj);
        jetpack.write('./message-log.json', messageLog);
        console.log('\x1b[36m%s\x1b[0m', '[SPECLESS CASCADE]', message);
        if (details !== null && details !== undefined) {
            console.log(details);
        }
    },
    markComponent: function (type) {
        function transform(file, cb) {
            // var prepend = '';
            // var component = file.relative.split('.')[0];
            // // if (type === 'html') {
            // //     prepend = '<!-- ' + component + ' -->\n';
            // // } else if (type === 'css' || type === 'js') {
            // //     prepend = '/* ' + component + ' */\n';
            // // }
            // file.contents = new Buffer(prepend + String(file.contents));
            cb(null, file);
        }
        return require('event-stream').map(transform);
    },
    knownPlugins: {},
    getPlugins: function () {
        var settings = this.compilerSettings.copy();
        var pluginSettings = settings.plugin || {};
        var pluginsDir = pluginSettings.root;
        var companies = pluginSettings.companies;
        var matches = [];
        var utils = this;
        var collectPlugins = function (company) {
            if (!company) {
                return;
            }
            var dir = path.join(process.cwd(), pluginsDir, company);
            var tree = jetpack.inspectTree(dir);
            _.each(tree.children, function (plugin) {
                if (plugin.type !== 'dir') {
                    return;
                }
                var plugPath = path.join(dir, plugin.name, '/settings/index.js');
                var pluginSettings = require(plugPath);
                matches.push(pluginSettings);
                // console.log(pluginSettings);
                utils.knownPlugins[pluginSettings.id] = pluginSettings;
            });
        };
        _.each(companies, collectPlugins);
        // once again at the end for user plugins
        collectPlugins();
        return _.uniq(matches);
    },
    addDeps: function (object, newObject, basePath) {
        var cascade = this.compilerSettings.copy();
        var whiteList = compilerSettings.js.whiteListedDeps;
        if (!newObject) {
            return object;
        }
        if (newObject.css) {
            _.each(newObject.css, function (dep) {
                object.css.push(compilerSettings.path + basePath + '/' + dep);
                object.css = _.uniq(object.css);
            });
        }
        if (newObject.jsPlugins) {
            _.each(newObject.jsPlugins, function (dep) {
                object.jsPlugins.push(compilerSettings.path + basePath + '/' + dep);
                object.jsPlugins = _.uniq(object.jsPlugins);
            });
        }
        if (newObject.js) {
            _.each(newObject.js, function (dep) {
                var whiteListed = false;
                _.each(whiteList, function (script) {
                    if (dep === script.name) {
                        object.jsWhiteList.push(dep);
                        object.jsWhiteList = _.uniq(object.jsWhiteList);
                        whiteListed = true;
                    }
                });
                if (whiteListed === false) {
                    var depPath = basePath + '/' + dep;
                    var projectTest = depPath.split("$$$PROJECT$$$");
                    if (projectTest.length > 1) {
                        depPath = compilerSettings.currentProjectDir + projectTest[1];
                    } else {
                        depPath = compilerSettings.path + depPath;
                    }
                    object.js.push(depPath);
                    object.js = _.uniq(object.js);
                }
            });
        }
        if (newObject.dataSources) {
            _.each(newObject.dataSources, function (dep) {
                object.dataSources.push(dep);
                object.dataSources = _.uniq(object.dataSources);
            });
        }
        if (newObject.jsSnippets) {
            _.each(newObject.jsSnippets, function (dep) {
                object.jsSnippets.push(dep);
                object.jsSnippets = _.uniq(object.jsSnippets);
            });
        }
        // }
        return object;
    },
    snakeToCamel: function (s) {
        return s.replace(/(\-\w)/g, function (m) {
            return m[1].toUpperCase();
        });
    },
    camelToSnake: function (str) {
        return str.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
    },
    normalizeAttrValue: function (value) {
        if (value === '' || value === 'true') {
            value = true;
        }
        if (value === 'false') {
            value = false;
        }
        return value;
    },
    exception: function (message) {
        throw new Error(message);
    }
};