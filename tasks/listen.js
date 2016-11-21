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
var gulpEjs = require('gulp-ejs');
gulp.task('recompile', function (cb) {
    runSequence(['plugins', 'wipe'], ['html', 'css', 'js'], function () {
        utils.projectSettings.write();
        cb();
    });
});
gulp.task('wipe', function (cb) {
    utils.projectSettings.read();
    cb();
});
gulp.task('watch-plugins', function () {
    gulp.watch(['./plugins/**/src/**/*', '!./plugins/**/dist/**/*'], ['plugins']);
});
var fse = require('fs-extra');
var argv = require('yargs').argv;
gulp.task('preview-build', function () {
    gulp.src('./src/**/*') //
        .pipe(gulpEjs()) //
        .pipe(gulp.dest('./dist'));
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
    var getUserHTML = function (component, url_) {
        return q.Promise(function (success, failure) {
            ejs.renderFile(path.join(cascade.currentProjectDir, component, 'index.html'), {
                // url: parsed_url.origin,
                component: component
            }, makePromiseHandler(success, failure));
        });
    };
    var makePromiseHandler = function (success, failure) {
        return function (err, result) {
            if (err) {
                return failure(err);
            }
            success(result);
        };
    };
    var getAdJSON = function () {
        return q.Promise(function (success, failure) {
            fs.readFile(path.join(currentProjectDir, cascade.settingsFileName), makePromiseHandler(success, failure));
        });
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
        if (params && params.identifier) {
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
        next();
    });
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
    app.use('/output', express.static(path.join(currentProjectDir, cascade.buildDir)));
    app.use('/input', express.static(currentProjectDir));
    app.use('/settings', express.static(path.join(currentProjectDir, cascade.settingsFileName)));
    var makeHost = function (req) {
        return req.protocol + '://' + req.hostname;
    };
    var findComponent = function (components, name) {
        return _.findWhere(components, {
            name: name
        });
    };
    app.get('/json/panel/:ad_id/:panel_id', function (req, res, next) {
        var params = req.params,
            host = makeHost(req),
            ad_id = params.ad_id,
            panel_id = params.panel_id,
            jsonPromise = getAdJSON(),
            name = parseName(panel_id),
            userHtmlPromise = getUserHTML(name, makeFullUrl(req));
        q.all([jsonPromise, userHtmlPromise]).then(function (results) {
            var json = results[0];
            var string = json.toString();
            var html = results[1].toString();
            var adJSON = JSON.parse(string || '{}');
            var foundComponent = findComponent(adJSON.components, name);
            var component = {
                name: name,
                html: html
            };
            addImports(host, component, foundComponent);
            res.send(component);
        }).catch(function (e) {
            res.status(500).send({});
        });
    });
    var addImports = function (host, readComponent, jsonComponent) {
        if (!readComponent || !jsonComponent) {
            return;
        }
        _.extend(readComponent, {
            base: host + ':8787/content/000000/vsn/randompath' + '000' + '/'
        }, jsonComponent);
        readComponent.imports = [{
            css: [{
                href: 'assets/base.css',
                id: 'base-styles'
            }]
        }].concat(jsonComponent.imports, [{
            css: [{
                href: 'panels/' + readComponent.name + '.css',
                id: 'user-styles'
            }],
            js: [{
                src: 'panels/' + readComponent.name + '.js',
                id: 'user-js'
            }]
        }]);
    };
    var parseName = function (part) {
        return part.split('_')[2];
    };
    var addImportsToMany = function (host, partsHash, adJSON) {
        _.each(partsHash, function (obj, key) {
            var component = findComponent(adJSON.components, obj.name);
            addImports(host, obj, component);
        });
    };
    app.get('/json/panels', function (req, res, next) {
        var adJSON, params = req.query;
        var parts = params.parts.split(',');
        var parsed_url = url.parse(req.url);
        var host = makeHost(req);
        q.all([getAdJSON()].concat(_.map(parts, function (part) {
            var name = parseName(part),
                full_url = makeFullUrl(req);
            return getUserHTML(name, full_url);
        }))).then(function (list) {
            var json = JSON.parse(list[0].toString());
            var html = list.slice(1);
            var partsHash = _.reduce(parts, function (memo, part, index) {
                memo[part] = {
                    name: part.split('_')[2],
                    html: html[index]
                };
                return memo;
            }, {});
            if (!list.length) {
                res.send({
                    settings: json,
                    parts: {},
                    plugins: {}
                });
            } else {
                addImportsToMany(host, partsHash, json);
                delete json.components;
                res.send({
                    settings: json,
                    parts: partsHash,
                    plugins: utils.knownPlugins
                });
            }
            // }
        });
        // getAdJSON(function (err, file) {
        //     if (err) {
        //         console.log(err);
        //         return err;
        //     }
        //     var split = parts[0].split('_');
        //     var popped = split.pop();
        //     var joined = split.join('_');
        //     adJSON = JSON.parse(file.toString() || '{}');
        //     trytosend();
        // });
        // trytosend();
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
