// var postcss = require('postcss');
// var _ = require('underscore');
// var utils = require('../js/utils.js');
// var jetpack = require('fs-jetpack');
// var Handlebars = require("handlebars");
// module.exports = function () {
//     function transform(file, cb) {
//         var userHtml = String(file.contents);
//         // console.log(userHtml);
//         var cascade = utils.compilerSettings.copy();
//         // var userHtmlTemplate = jetpack.read(cascade.path + cascade.html.templateFilePath);
//         var component = file.relative.split('.')[0];
//         var data = {
//             component: component,
//             css: component + '.css',
//             content: userHtml,
//             contextObject: '{{{ contextObject }}}'
//         };
//         var htmlTemplate = Handlebars.compile(userHtmlTemplate);
//         html = htmlTemplate(data);
//         file.contents = new Buffer(html);
//         cb(null, file);
//     }
//     return require('event-stream').map(transform);
// };