// child_process is used to spawn the scss-lint binary
var child_process = require('child_process');
var _ = require('underscore');
// map-stream is used to create a stream that runs an async function
var map = require('map-stream');
// gulp-util is used to created well-formed plugin errors
var gutil = require('gulp-util');
// The main function for the plugin – what the user calls – should return
// a stream.
var cssIntent = function () {
    // Run the scss-lint binary in a separate process, inheriting all stdio
    // from the gulp process.  Errors and stdout will be logged by gulp.
    var split = function (file) {
        return file._contents.toString().split(/;|\n/gm);
    };
    // Create and return a stream that, for each file, asynchronously
    // processes the file through scss-lint and calls the callback method
    // when complete.
    return map(function (file, cb) {
        // console.dir(file._contents.toString());
        var splits = _.foldl(split(file), function (memo, item) {
            var trimmed;
            if ((trimmed = item.trim())) {
                memo.push(trimmed);
            }
            return memo;
        }, []);
        cb(null, file);
    });
};
// Export the plugin main function
module.exports = cssIntent;