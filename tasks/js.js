var gulp = require('gulp');
var _ = require('underscore');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var utils = require('../js/utils.js');
var processJs = require('../js/process-js.js');
var beautify = require('gulp-beautify');
gulp.task('js', function () {
    utils.sendMessage("Command Received: Compile Javascript", null, 1);
    var cascade = utils.compilerSettings.copy();
    var settings = utils.projectSettings.copy();
    var folder = utils.projectSettings.folder();
    var glob = [folder + '/**/' + cascade.js.fileName, '!' + folder + '/{' + cascade.assetsDirName + ',' + cascade.assetsDirName + '/**}'];
    var success = true;
    return gulp.src(glob).pipe(plumber({
        errorHandler: function (error) {
            console.log(error);
            utils.sendMessage("There was an error compiling your javascript.", error.message, 5);
            success = false;
        }
    })).pipe(rename(function (path) {
        path.basename = path.dirname;
        path.dirname = '';
    })).pipe(processJs()).pipe(beautify({
        indentSize: 4
    })).pipe(gulp.dest(folder + '/' + cascade.buildDir)).on('end', function (err) {
        if (success === true) {
            utils.sendMessage("Javascript Compiled successfully.", null, 4);
        }
        // utils.saveProjectSettings();
        utils.sendMessage("Command Completed: Compile Javascript", null, 1);
        success = true;
    });
});