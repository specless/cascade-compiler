var gulp = require('gulp');
var utils = require('../js/utils.js');
var _ = require('underscore');
var express = require('express');
var app = express();
var httpService = require('http');
var http = httpService.Server(app);
var io = require('socket.io')(http);
var deepReaddir = require('deep-readdir');
var chokidar = require('chokidar');
var runSequence = require('run-sequence');
var bodyParser = require('body-parser');
var fs = require('fs');
var path = require('path');
var url = require('url');
var ejs = require('ejs');
var stream = require('stream');
var through = require('through2');
var gutil = require('gulp-util');
var q = require('q');
var jetpack = require('fs-jetpack');
var PluginError = gutil.PluginError;
var argv = require('yargs').argv;
gulp.task('recompile', function (cb) {
    runSequence('plugins', ['html', 'css', 'js'], function () {
        utils.projectSettings.write();
        cb();
    });
});
gulp.task('watch-plugins', function () {
    gulp.watch(['./plugins/**/src/**/*', '!./plugins/**/dist/**/*'], ['plugins']);
});
var fse = require('fs-extra');
var argv = require('yargs').argv;
gulp.task('preview-build', function () {
    gulp.src('./src/**/*').pipe(gulp.dest('./dist'));
});
gulp.task('plugins', function () {
    var cascade = utils.compilerSettings.copy();
    var plugin = cascade.plugin;
    var dir = path.join(process.cwd(), plugin.root);
    var copySrcDist = function (folder, s, f) {
        var dist = path.join(folder, './dist');
        var src = path.join(folder, './src');
        var straightCopy = {
            js: true,
            html: true
        };
        deepReaddir.deepReaddir(src, function (list) {
            q.all(_.map(list, function (item) {
                var relative = path.relative(src, item);
                var extension = path.extname(relative);
                var relativeDist = path.join(src, '../dist', relative);
                if (!extension) {
                    return;
                }
                extension = extension.slice(1);
                if (straightCopy[extension]) {
                    fs.readFile(item, function (err, file) {
                        jetpack.write(relativeDist, file);
                    });
                } else if (extension === 'css') {
                    require('./css.js').glob(path.join(src, relative), utils.compilerSettings.copy().css.syntax, {}, null, function (err) {
                        console.error(err);
                    }).pipe(through.obj(function (file, enc, cb) {
                        // var contents = file.toString();
                        // console.dir(file._contents.toString());
                        jetpack.write(relativeDist, file._contents.toString());
                    }));
                }
            })).then(s).catch(f);
        }, {
            hidden: false
        });
    };
    var readsPlugins = function (companypath, list) {
        return q.all(_.map(list, function (folder) {
            if (!folder || folder[0] === '.') {
                return;
            }
            return q.Promise(function (s, f) {
                var pluginfolder = path.join(companypath, folder);
                var gulpfilepath = path.join(pluginfolder, 'gulpfile.js');
                fs.readFile(gulpfilepath, function (err, file) {
                    if (err || !file) {
                        copySrcDist(pluginfolder, s, f);
                    } else {
                        // run gulpfile
                    }
                });
            });
        }));
    };
    return q.all(_.map(plugin.companies, function (company) {
        return q.Promise(function (success, failure) {
            var companypath = path.join(dir, company);
            fs.readdir(companypath, function (err, list) {
                readsPlugins(companypath, list).then(success, failure);
            });
        });
    }));
});
var gutil = require('gulp-util');
var string_src = function (filename, string) {
    var src = require('stream').Readable({
        objectMode: true
    });
    src._read = function () {
        this.push(new gutil.File({
            cwd: "/",
            base: "/test/",
            path: filename,
            contents: new Buffer(string)
        }));
        this.push(null);
    };
    return src;
};
gulp.task('listen', function () {
    // utils.sendMessage("Command Received: Start Server and Listen for Changes", null, 1);
    var cascade = utils.compilerSettings.copy();
    var settings = utils.projectSettings.copy();
    var currentProjectDir = cascade.currentProjectDir;
    var cascade_settings = require('../settings');
    var htmlFiles = [path.join(currentProjectDir, '/**/', cascade.html.fileName), path.join('!', currentProjectDir, '/{', cascade.assetsDirName, ',', cascade.assetsDirName, '/**}')];
    var cssFiles = [path.join(currentProjectDir, '/**/', cascade.css.fileName), path.join('!', currentProjectDir, '/{', cascade.assetsDirName, ',', cascade.assetsDirName, '/**}')];
    var jsFiles = [path.join(currentProjectDir, '/**/', cascade_settings.js.fileName), path.join('!', currentProjectDir, '/{', cascade.assetsDirName, ',', cascade.assetsDirName, '/**}')];
    var assetFiles = [path.join(currentProjectDir, '/assets/**/*')];
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
    app.get('/', function (req, res) {
        utils.sendMessage("Server: Opening Preview Interface", null, 2);
        var width = 300;
        var height = 250;
        var previewPrefix = 'http://app.specless.io/preview/' + cascade.csfVersion + '?ad=000000&width=' + width + '&height=' + height + '#';
        var projectSettings = utils.projectSettings.copy();
        var previewObj = {
            unfriendlyCreative: true,
            components: []
        };
        var previewUrl;
        _.each(projectSettings.components, function (component) {
            var prefix = 'http://localhost:' + (argv.port || 8787) + '/components/' + component.name;
            var obj = {
                src: prefix + '.html',
                jsLocation: prefix + '.js'
            };
            if (component.name === 'loader') {
                previewObj.components.unshift(obj);
            } else {
                previewObj.components.push(obj);
            }
        });
        previewObj = JSON.stringify(previewObj);
        previewUrl = previewPrefix + previewObj;
        res.location(previewUrl);
        res.redirect(302, previewUrl);
    });
    app.get('/killme', function (req, res) {
        utils.sendMessage("Server: Server Killed", null, 2);
        res.send("Success. Cascade Server Killed.");
        process.exit();
    });
    io.on('connection', function (socket) {
        io.emit('Compiler Connected');
        utils.sendMessage("Server: New Sockets Connection", null, 2);
    });
    var paths = function (base) {
        return {
            absolute: function (input) {
                return path.join(base, input);
            }
        };
    };
    // var morgan = require('morgan');
    // app.use(morgan('dev'));
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());
    var renderComponent = function (component, url_, fn) {
        return ejs.renderFile(path.join(currentProjectDir, '.output/', component + '.html'), {
            url: 'http://localhost:8787/',
            component: component
                // paths: paths('http://localhost:8787/')
        }, function (e) {
            return fn && fn.apply(this, arguments);
        });
    };
    var makeFullUrl = function (req) {
        return req.protocol + '://' + req.get('host') + req.url;
    };
    var getUserHTML = function (component, url_, fn) {
        return ejs.renderFile(path.join(cascade.currentProjectDir, component, 'index.html'), {
            // url: parsed_url.origin,
            component: component
        }, function (e) {
            return fn && fn.apply(this, arguments);
        });
    };
    var getAdJSON = function (fn) {
        fs.readFile(path.join(currentProjectDir, cascade.settingsFileName), fn);
    };
    var assetsRoute = express.static(path.join(currentProjectDir, cascade.assetsDirName));
    var componentsStatic = express.static(path.join(currentProjectDir, cascade.buildDir));
    var pluginSettings = cascade.plugin;
    var pluginsFolder = path.join(process.cwd(), pluginSettings.root);
    var pluginsRoute = express.static(pluginsFolder);
    var pattern = '/content/:content_id/:version?/:alternater?';
    var plugs = {};
    var pluginsRouteIndex = function (req, res, next) {
        var indexpath, identifier, params = req.params;
        if (params && (identifier = params.identifier)) {
            req.addPluginDist = true;
        }
        next();
    };
    app.use(path.join(pattern, 'assets'), assetsRoute);
    app.use(path.join(pattern, 'plugins/:identifier/'), pluginsRouteIndex);
    app.use(path.join(pattern, 'panels/plugins/:identifier/'), pluginsRouteIndex);
    app.use('/plugins/:identifier/', pluginsRouteIndex);
    app.use(function (req, res, next) {
        var identifier, plug, plugs, splitUrl, company, name, params = req.params;
        if (req.addPluginDist) {
            // identifier = params.identifier;
            splitUrl = req.url.split('/plugins/');
            splitUrl = ('/plugins/' + splitUrl.slice(1).join('/plugins/')).split('/');
            splitUrl.splice(3, 0, 'dist');
            identifier = splitUrl[2];
            plug = utils.knownPlugins[identifier];
            splitUrl.splice(2, 1, plug.company, plug.name);
            req.url = splitUrl.join('/');
        }
        next();
    });
    app.use('/plugins/:company/:name/', function (req, res, next) {
        if (req.url === '/dist/') {
            req.url = '/dist/index.js';
        }
        // var splitUrl = req.url.split('/');
        // var plugs = utils.knownPlugins;
        // console.log(plugs, params, identifier);
        // var plug = plugs[identifier];
        // var company = plug.company;
        // var name = plug.name;
        // splitUrl.splice(1, 1, company, name);
        // req.url = splitUrl.join('/');
        // splitUrl[1] = plugs[splitUrl[1]];
        next();
    });
    // app.use('/plugins', function (req, res, next) {
    //     next();
    // });
    var pluginTemplate = jetpack.read(path.join(process.cwd(), 'templates/plugins.js'));
    app.get('/plugins/**/*.js', function (req, res, next) {
        var split = req.url.split('/');
        var plugin = _.find(utils.knownPlugins, function (plugin, id) {
            return plugin.company === split[2] && plugin.name === split[3];
        });
        fs.readFile(path.join(process.cwd(), req.url), function (err, contents) {
            if (err) {
                return next();
            }
            res.send(contents.toString().replace('__PLUGIN_ID__', plugin.id));
        });
    });
    app.use('/plugins', pluginsRoute);
    app.use(path.join(pattern, '/assets'), assetsRoute);
    app.use(path.join(pattern, '/panels/assets'), assetsRoute);
    app.use(path.join(pattern, '/panels'), function (req, res, next) {
        var parsed_url = url.parse(req.url);
        if ((pathnamesplit = parsed_url.pathname.split('.'))[pathnamesplit.length - 1] === 'html') {
            renderComponent(component, req.url, function (err, html) {
                res.send(html);
            });
        } else {
            return componentsStatic.apply(this, arguments);
        }
    });
    app.use('/settings', express.static(path.join(currentProjectDir, cascade.settingsFileName)));
    app.get('/json/panels', function (req, res, next) {
        var adJSON, params = req.query;
        var parts = params.parts.split(',');
        var i = 0;
        var partsHash = {};
        var parsed_url = url.parse(req.url);
        var trytosend = function () {
            var partsLength = _.keys(partsHash).length;
            if (adJSON && partsLength === parts.length) {
                trytosend = _.noop;
                if (!parts.length) {
                    res.send({
                        settings: adJSON,
                        parts: {},
                        plugins: {}
                    });
                } else {
                    _.each(partsHash, function (obj, key) {
                        if (!obj) {
                            return;
                        }
                        var component = _.findWhere(adJSON.components, {
                            name: obj.name
                        });
                        _.extend(obj, {
                            base: req.protocol + '://' + req.hostname + ':8787/content/000000/vsn/randompath' + '000' + '/'
                                // parseInt(Math.random() * 1000)
                        }, component);
                        obj.imports = [{
                            css: [{
                                href: 'assets/base.css',
                                id: 'base-styles'
                            }]
                        }].concat(component.imports, [{
                            css: [{
                                href: 'panels/' + obj.name + '.css',
                                id: 'user-styles'
                            }],
                            js: [{
                                src: 'panels/' + obj.name + '.js',
                                id: 'user-js'
                            }]
                        }]);
                    });
                    delete adJSON.components;
                    res.send({
                        settings: adJSON,
                        parts: partsHash,
                        plugins: utils.knownPlugins
                    });
                }
            }
        };
        _.each(parts, function (part) {
            var name = part.split('_')[2];
            getUserHTML(name, makeFullUrl(req), function (err, html) {
                if (err) {
                    partsHash[part] = null;
                    trytosend();
                    return err;
                }
                partsHash[part] = {
                    name: name,
                    html: html
                };
                trytosend();
            });
        });
        getAdJSON(function (err, file) {
            if (err) {
                console.log(err);
                return err;
            }
            var split = parts[0].split('_');
            var popped = split.pop();
            var joined = split.join('_');
            adJSON = JSON.parse(file.toString() || '{}');
            trytosend();
        });
        trytosend();
    });
    app.post('/compiler/css', function (req, res, next) {
        var string = req.body && req.body.string;
        var utils = require('../js/utils.js');
        var cascade = utils.compilerSettings.copy();
        var plumber = require('gulp-plumber');
        // var glob = require('glob');
        // var new_stream = new stream.Readable(new Buffer(string));
        var obj = {};
        require('./css.js').glob(null, cascade.css.syntax, obj, function () {
            return string_src('test.css', string);
        }, function (err) {
            res.status(500).send(JSON.stringify({
                type: 'error',
                result: '',
                imports: [],
                stack: err
            }));
        }).pipe(through.obj(function (file, enc, cb) {
            var compiledcss = file._contents.toString();
            var imports = [{
                css: []
            }];
            compiledcss = compiledcss.replace(/\@import\s?[\'\"](.*)[\'\"]\;+?\s+?/gm, function (match_) {
                var match = match_.split('@import ').join('') //
                    .split('"').join('') //
                    .split('\'').join('') //
                    .split(';').join('') //
                    .split('\n').join('');
                imports[0].css.push({
                    href: match
                });
                return '';
            });
            res.send(_.extend(obj.components.compiler, {
                result: compiledcss,
                imports: imports
            }));
            cb(null, file);
        }));
    });
    app.use(require('express-tension')('./dist'));
    app.use(express.static('./dist'));
    app.use(function (req, res, next) {
        console.log("404: " + req.url);
        res.status(404);
        res.send(new Error('not found'));
    });
    return q.Promise(function (success, failure) {
        app.listen((argv.port || 8787), '0.0.0.0', function (err) {
            utils.sendMessage("Server: Listening On Port: " + (argv.port || 8787), null, 2);
            success();
        });
    });
});