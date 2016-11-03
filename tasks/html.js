var gulp = require('gulp');
var _ = require('underscore');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var utils = require('../js/utils.js');
var posthtml = require('gulp-posthtml');
var prettify = require('gulp-html-prettify');
var tap = require('gulp-tap');
// var processHtml = require('../js/process-html.js');
var Handlebars = require("handlebars");
gulp.task('html', function () {
    // utils.sendMessage("Command Received: Compile HTML", null, 1);
    var cascade = utils.compilerSettings.copy();
    var settings = utils.compilerSettings.copy();
    var folder = utils.projectSettings.folder();
    var glob = [folder + '/**/' + cascade.html.fileName, '!' + folder + '/{' + cascade.assetsDirName + ',' + cascade.assetsDirName + '/**}'];
    var items = [];
    var posthtmlOptions = {
        closingSingleTag: 'slash'
    };
    var success = true;
    var passedOpts = {
        prefix: cascade.html.syntax.prefix,
        attrPrefix: cascade.html.syntax.attributeFinalPrefix
    };
    return gulp.src(glob).pipe(plumber({
            errorHandler: function (error) {
                utils.sendMessage("There was an error compiling your HTML.", error.message, 5);
                console.log(error.stack);
                success = false;
            }
        }))
        // .pipe(tap(function () {
        //         // console.log(items);
        //         items = [];
        //     }))
        .pipe(rename(function (path) {
            path.basename = path.dirname;
            path.dirname = '';
        })).pipe(tap(function (file) {
            passedOpts.component = file.relative.split('.')[0];
        }))
        // .pipe(require('event-stream').map(function (file, cb) {
        //         var post = posthtml([
        //             require('../js/posthtml-ad-elements')({
        //                 prefix: cascade.html.syntax.prefix,
        //                 attrPrefix: cascade.html.syntax.attributeFinalPrefix,
        //                 file: file
        //             })
        //         ], posthtmlOptions).process(file, {});
        //         console.log(post);
        //         // return post.map(file);
        //         // var prepend = '';
        //         // var component = file.relative.split('.')[0];
        //         // // if (type === 'html') {
        //         // //     prepend = '<!-- ' + component + ' -->\n';
        //         // // } else if (type === 'css' || type === 'js') {
        //         // //     prepend = '/* ' + component + ' */\n';
        //         // // }
        //         // file.contents = new Buffer(prepend + String(file.contents));
        //         // cb(null, file);
        //     }))
        // .pipe(utils.markComponent('html'))
        .pipe(posthtml([
            require('../js/posthtml-ad-elements')(passedOpts)
        ], posthtmlOptions))
        // .pipe(processHtml())
        .pipe(prettify({
            indent_size: 4
        })).pipe(gulp.dest(folder + '/' + cascade.buildDir)).on('end', function (err) {
            if (success === true) {
                utils.sendMessage("HTML Compiled successfully.", null, 4);
            }
            // utils.sendMessage("Command Completed: Compile HTML", null, 1);
            success = true;
        });
});