var gulp = require('gulp');
var utils = require('../js/utils.js');
var _ = require('underscore');
var Q = require('q');
var suzy = require('aunt-suzy');
gulp.task('set-project', function () {
    var deferred = Q.defer();
    // utils.sendMessage("Command Received: Set Project Directory", null, 1);
    var path;
    var argv = require('yargs').usage('Usage: $0 -path [string]').demand(['path']).argv;
    // _.each(process.argv, function(arg) {
    //    thisArg = arg.split('=');
    //    if (thisArg.length === 2) {
    // 	   	if (thisArg[0] === '--path') {
    // 	   		path = thisArg[1];
    // 	   	}
    //    }
    // });
    // console.log(argv.path);
    path = suzy.normalize(argv.path);
    if (utils.validateProject(path) === true) {
        utils.compilerSettings.set({
            currentProjectDir: path
        });
        utils.sendMessage("The project located at '" + path + "' is a valid Cascade project.", null, 2);
        utils.sendMessage("Current project directory set to: '" + path + "'.", null, 0);
        // utils.sendMessage("Command Completed: Set Project Directory", null, 1);
        deferred.resolve();
    } else {
        utils.sendMessage("The project located at '" + path + "' is a not valid Cascade project.", null, 3);
        // utils.sendMessage("Command Completed: Set Project Directory", null, 1);
        deferred.reject(new Error("The project located at '" + path + "' is a not valid Cascade project."));
    }
    return deferred.promise;
});