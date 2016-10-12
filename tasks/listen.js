var gulp = require('gulp');
var utils = require('../js/utils.js');
var _ = require('underscore');
var express = require('express');
var app = express();
var httpService = require('http');
var http = httpService.Server(app);
var io = require('socket.io')(http);
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
var PluginError = gutil.PluginError;
gulp.task('reload', ['recompile'], function () {
    io.emit('reload', utils.projectSettings.copy());
});
gulp.task('recompile', function () {
    runSequence('html', ['css', 'js']);
});
var currentData;
gulp.task('reload-css', function () {
    currentData = utils.projectSettings.copy();
    runSequence('css', 'emit-reload');
});
gulp.task('emit-reload', ['recompile'], function () {
    var updatedData = utils.projectSettings.copy();
    var message = 'reload';
    if (_.isEqual(currentData.components, updatedData.components)) {
        message = 'reload-css';
    }
    io.emit('reload', utils.projectSettings.copy());
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
gulp.task('listen', ['build'], function () {
    utils.sendMessage("Command Received: Start Server and Listen for Changes", null, 1);
    var cascade = utils.compilerSettings.copy();
    var settings = utils.projectSettings.copy();
    var cascade_settings = require('../settings');
    var htmlFiles = [settings.path + '/**/' + cascade.html.fileName, '!' + settings.path + '/{' + cascade.assetsDirName + ',' + cascade.assetsDirName + '/**}'];
    var cssFiles = [settings.path + '/**/' + cascade.css.fileName, '!' + settings.path + '/{' + cascade.assetsDirName + ',' + cascade.assetsDirName + '/**}'];
    var jsFiles = [settings.path + '/**/' + cascade_settings.js.fileName, '!' + settings.path + '/{' + cascade.assetsDirName + ',' + cascade.assetsDirName + '/**}'];
    var allFiles = [settings.path + '/**/*', '!' + settings.path + '/{' + cascade.buildDir + ',' + cascade.buildDir + '/**}'];
    var assetFiles = [settings.path + '/assets/**/*'];
    gulp.watch(htmlFiles, ['reload']);
    gulp.watch(cssFiles, ['reload-css']);
    gulp.watch(jsFiles, ['reload']);
    chokidar.watch(assetFiles).on('all', function (event, path) {
        io.emit('reload-asset', {
            event: event,
            path: path,
            project: utils.projectSettings.copy()
        });
    });
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
            var prefix = 'http://localhost:' + cascade.serverPort + '/components/' + component.name;
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
        // console.log(url_);
        return ejs.renderFile(path.join(cascade.currentProjectDir, '.output/', component + '.html'), {
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
        fs.readFile(settings.path + '/' + cascade.settingsFileName, fn);
    };
    var assetsRoute = express.static(settings.path + '/' + cascade.assetsDirName);
    var componentsStatic = express.static(settings.path + '/' + cascade.buildDir);
    app.use('/content/:content_id/:version?/:alternater?/panels/assets', assetsRoute);
    app.use('/content/:content_id/:version?/:alternater?/panels', function (req, res, next) {
        var parsed_url = url.parse(req.url);
        if ((pathnamesplit = parsed_url.pathname.split('.'))[pathnamesplit.length - 1] === 'html') {
            renderComponent(component, req.url, function (err, html) {
                res.send(html);
            });
        } else {
            return componentsStatic.apply(this, arguments);
        }
    });
    app.use('/content/:content_id/:version?/:alternater?/assets', assetsRoute);
    app.use('/settings', express.static(settings.path + '/' + cascade.settingsFileName));
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
                        parts: {}
                    });
                } else {
                    _.each(partsHash, function (obj, key) {
                        var component = _.findWhere(adJSON.components, {
                            name: obj.name
                        });
                        _.extend(obj, {
                            base: req.protocol + '://' + req.hostname + ':8787/content/000000/vsn/randompath' + parseInt(Math.random() * 1000) + '/'
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
                        parts: partsHash
                    });
                }
            }
        };
        _.each(parts, function (part) {
            var name = part.split('_')[2];
            getUserHTML(name, makeFullUrl(req), function (err, html) {
                if (err) {
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
    app.listen(cascade.serverPort, '0.0.0.0', function (err) {
        utils.sendMessage("Server: Listening On Port: " + cascade.serverPort, null, 2);
    });
});