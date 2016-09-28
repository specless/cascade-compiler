var postcss = require('gulp-postcss');
var postcss_plugger = require('postcss');
var gulp = require('gulp');
var _ = require('underscore');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var utils = require('../js/utils.js');
// var strip = require("strip-css-singleline-comments");
var tap = require("gulp-tap");
var toBuffer = require("gulp-buffer");
var globber = function (glob, syntax, dump, custom_fn, err_handler, finished_hander) {
    var postcssBefore = [
        require('../js/postcss-ad-elements')(),
        require('postcss-sassy-mixins')({}),
        require('postcss-simple-vars'),
        require('postcss-atroot'),
        require('postcss-simple-extend'),
        require('postcss-conditionals'),
        require('postcss-each'),
        require('postcss-for'),
        require('postcss-custom-selectors'),
        require("postcss-color-function"),
        require('postcss-nested')({
            bubble: syntax.contexts.concat([syntax.flowlane, syntax.breakpoint])
        }),
        require('../js/postcss-breakpoints', {
            contexts: syntax.contexts,
            operators: syntax.contextOperators,
            attrPrefix: syntax.attrPrefix,
            attrJoiner: syntax.attrJoiner,
            attrExplicitJoiner: syntax.attrExplicitJoiner,
            attrEnding: syntax.attrEnding,
            breakpointDefault: 'min'
        }),
        require('../js/postcss-flowlanes-breakpoints')({
            flowlaneSyntax: syntax.flowlane,
            defineFlowlaneSyntax: syntax.flowlaneDefine,
            breakpointSyntax: syntax.breakpoint,
            breakpointDefault: syntax.defaultBreakpointType,
            attrPrefix: syntax.attrPrefix,
            attrJoiner: syntax.attrExplicitJoiner,
            attrEnding: syntax.attrEnding,
            flowlaneProps: syntax.flowlaneProperties,
            flowlaneDefaults: syntax.flowlaneDefaults,
            dump: dump
        }),
        require('../js/postcss-context-queries')({
            contexts: syntax.contexts,
            operators: syntax.contextOperators,
            attrPrefix: syntax.attrPrefix,
            attrJoiner: syntax.attrJoiner,
            attrExplicitJoiner: syntax.attrExplicitJoiner,
            attrEnding: syntax.attrEnding,
            dump: dump
                // logResults: true,
                // logTo: 'project'
        }),
        require('postcss-reporter')({
            clearMessages: true
        })
    ];
    var postcssAfter = [
        require('postcss-nested'),
        require('postcss-calc'),
        require('postcss-functions'),
        require('postcss-color-function'),
        require('postcss-aspect-ratio'),
        require('postcss-filter-gradient'),
        require('postcss-easings'),
        require('postcss-animation'),
        require('postcss-assets'),
        require('autoprefixer'),
        require('../js/replace-rems.js')(),
        require('../js/newline-comma.js')(),
        require('postcss-discard-comments')
    ];
    // var success = true;
    if (custom_fn) {
        result = custom_fn(postcssBefore, postcssAfter);
    }
    return ((glob ? gulp.src(glob, {
            buffer: false
        }) : result) //
        .pipe(plumber({
            errorHandler: function (error) {
                utils.sendMessage("There was an error compiling your css.", error.message, 5);
                this.successfullyCompiled = false;
                console.log(error.stack);
                return err_handler && err_handler(error);
            }
        })) //
        .pipe(toBuffer()) //
        .pipe(postcss(postcssBefore)) //
        .pipe(postcss(postcssAfter)));
};
module.exports = {
    glob: globber,
    registerTask: function () {
        gulp.task('css', function () {
            var Q = require('Q');
            utils.sendMessage("Command Received: Compile CSS", null, 1);
            var cascade = utils.compilerSettings.copy();
            var component = process.argv[3];
            var glob;
            var project = utils.projectSettings.copy();
            var folder = utils.projectSettings.folder();
            if (component) {
                component = component.replace('--', '');
                glob = [folder + '/' + component + '/' + cascade.css.fileName];
            } else {
                glob = [folder + '/**/' + cascade.css.fileName, '!' + folder + '/{' + cascade.assetsDirName + ',' + cascade.assetsDirName + '/**}'];
            }
            var after_, dump = {};
            var css_deferred = Q.Promise(function (success, failure) {
                globber(glob, cascade.css.syntax, dump, function (before, after) {
                        after_ = after;
                        before.unshift(require('../js/postcss-imports')());
                        before.unshift(require('postcss-import')({
                            root: './',
                            path: folder
                        }));
                        after.unshift(require('postcss-easysprites')({
                            imagePath: folder,
                            spritePath: folder + '/' + cascade.assetsDirName
                        }));
                    }).pipe(rename(function (path) {
                        path.basename = path.dirname;
                        path.dirname = '';
                    })).pipe(gulp.dest(folder + '/' + cascade.buildDir)) //
                    .on('end', function (err) {
                        if (this.successfullyCompiled !== false) {
                            utils.sendMessage("CSS Compiled successfully.", null, 4);
                        }
                        utils.sendMessage("Command Completed: Compile CSS", null, 1);
                        _.each(dump.components, function (values, which) {
                            utils.component(which, function (component) {
                                _.extend(component, values);
                            });
                        });
                        if (this.successfullyCompiled) {
                            success();
                        } else {
                            failure();
                        }
                        this.successfullyCompiled = true;
                    });
            });
            var assets_deferred = Q.Promise(function (success, failure) {
                gulp.src(folder + cascade.css.templateFilePath).pipe(postcss(after_)).pipe(gulp.dest(folder + '/' + cascade.assetsDirName)).on('end', function (err) {
                    if (err) {
                        console.log('could not build base css', err.stack);
                        failure();
                        return err;
                    }
                    success();
                });
            });
            return Q.all([assets_deferred, css_deferred]);
        });
    }
};