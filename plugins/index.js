var _ = require('lodash');
var r = function (where) {
    return require('./plugs/' + _.kebabCase(where));
};
module.exports = {
    adVideo: r('adVideo'),
    adLoadingIcon: r('adLoadingIcon'),
    adCloseButton: r('adCloseButton')
};