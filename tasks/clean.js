var gulp = require('gulp');
var utils = require('../js/utils.js');
var clean = require('gulp-clean');
var plumber = require('gulp-plumber');
var jetpack = require('fs-jetpack');
var path = require('path');
gulp.task('clean', function () {
    var messageLog = './message-log.json';
    jetpack.write(messageLog, '[]');
    utils.sendMessage("Command Received: Clean Output Directory", null, 1);
    var cascade = utils.compilerSettings.copy();
    var success = true;
    return gulp.src([utils.projectSettings.folder() + '/' + cascade.buildDir, cascade.publishDir], {
        read: false
    }).pipe(plumber({
        errorHandler: function (error) {
            utils.sendMessage("There was an error cleaning up your project.", error.message, 3);
            success = false;
        }
    })).pipe(clean({
        force: true
    })).on('end', function (details) {
        if (success === true) {
            utils.sendMessage("Project cleaned up successfully.", null, 1);
        }
        utils.sendMessage("Command Completed: Clean Output Directory", null, 1);
        success = true;
    });
});