var gulp = require('gulp');
var utils = require('./js/utils.js');
var runSequence = require('run-sequence');
var prompt = require('gulp-prompt');
var q = require('q');
utils.compilerSettings.set({
    path: __dirname
});
require('./tasks/set-project');
require('./tasks/clean');
require('./tasks/listen');
require('./tasks/html');
require('./tasks/css').registerTask();
require('./tasks/js');
require('./tasks/publish');
require('./tasks/new');
gulp.task('open', ['clean'], function () {
    // utils.sendMessage("Command Received: Open Project", null, 1);
    return q.Promise(function (success, failure) {
        utils.openProject(utils.projectSettings.folder(), function (s) {
            if (s === true) {
                utils.sendMessage("Project opened successfully.", null, 2);
                // utils.sendMessage("Command Completed: Open Project", null, 1);
                success();
            } else if (s === false) {
                utils.sendMessage("There was an error opening this project.", null, 3);
                // utils.sendMessage("Command Completed: Open Project", null, 1);
                failure();
            }
        });
    });
});
gulp.task('build', function () {
    // utils.sendMessage("Command Received: Build Project", null, 1);
    return q.Promise(function (success, failure) {
        runSequence('open', 'recompile', function (err) {
            if (err) {
                utils.sendMessage("There was an error building your project.", err.message, 3);
                // utils.sendMessage("Command Completed: Build Project", null, 1);
                failure(new Error(err));
            } else {
                // utils.projectSettings.write();
                utils.sendMessage("Project built successfully.", null, 2);
                // utils.sendMessage("Command Completed: Build Project", null, 1);
                success();
            }
        });
    });
});
gulp.task('start', [], function (cb) {
    runSequence('build', 'listen', /*'open-browser',*/ function () {
        gulp.watch(utils.projectSettings.allFiles(), ['recompile']);
    });
});