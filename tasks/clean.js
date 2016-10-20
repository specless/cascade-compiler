var gulp = require('gulp');
var utils = require('../js/utils.js');
var clean = require('gulp-clean');
var plumber = require('gulp-plumber');
var jetpack = require('fs-jetpack');
var path = require('path');
var q = require('q');
gulp.task('clean', function () {
    var messageLog = './message-log.json';
    jetpack.write(messageLog, '[]');
    // utils.sendMessage("Command Received: Clean Output Directory", null, 1);
    var cascade = utils.compilerSettings.copy();
    // var success = true;
    return q.Promise(function (success, failure) {
        return gulp.src([path.join(utils.projectSettings.folder(), cascade.buildDir), cascade.publishDir], {
                read: false
            }) //
            .pipe(plumber({
                errorHandler: function (error) {
                    utils.sendMessage("There was an error cleaning up your project.", error.message, 3);
                    failure(error);
                }
            })) //
            .pipe(clean({
                force: true
            })) //
            .on('error', failure) //
            .on('data', function () {
                //
            }) // fix end emit, listen the data
            .on('end', success);
    });
});