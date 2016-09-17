var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
module.exports = postcss.plugin('breakpoints', function (opts_) {
    var opts = opts_ || {
        contexts: ['custom'],
        operators: [':', '>', '<', '==', '|=', '^=', '$=', '*='],
        attrPrefix: '[data-',
        attrJoiner: '~="',
        attrExplicitJoiner: '="',
        attrEnding: '"]',
        // logResults: false,
        dump: {},
        // logTo: 'file',
        breakpointDefault: 'max'
    };
    var removeQuotesAndParentheses = function (string) {
        return string.replace(/([\'\"\(\)])/g, '');
    };
    var minMaxHash = {
        min: '>=',
        max: '<='
    };
    var wrapParenthetically = function (string) {
        return (string[0] !== '(' ? '(' : '') + string + (string[string.length - 1] !== ')' ? ')' : '');
    };
    var eachParam = function (params_, method) {
        var params = params_.trim();
        return params && wrapParenthetically(_.map(params.split(/\)\s?,\s?\(/gm), function (parentheticalParams) {
            var paramsAndSplit = parentheticalParams.split(/\)\s?and\s?\(/gm);
            return wrapParenthetically(_.map(paramsAndSplit, function (param_) {
                var direction, valSplit, valSplit0, param = removeQuotesAndParentheses(param_),
                    args = param.split(/\s?:\s?/gm),
                    key = args[0],
                    value = args[1],
                    context = 'scaled';
                if (+key === +key) {
                    value = key;
                    key = opts.breakpointDefault;
                }
                keySplit = key.split(/\s?:\s?/gm);
                direction = minMaxHash[keySplit[0]] || minMaxHash[opts.breakpointDefault];
                valSplit = value.split(/\s?,\s?/gm);
                isVertical = value[1] === 'vertical';
                valSplit0 = valSplit[0];
                value = +valSplit0 === +valSplit0 ? +valSplit0 : valSplit0;
                return method({
                    vertical: isVertical,
                    direction: direction,
                    value: value
                });
            }).join(') and ('));
        }).join('), ('));
    };
    return function (css, result) {
        var pathArray = css.source.input.file.split('/');
        var file = {
            path: pathArray.join('/'),
            name: pathArray.pop(),
            folder: pathArray.join('/'),
            component: pathArray.pop()
        };
        css.walkAtRules(function (node) {
            var name = node.name;
            if (name !== 'breakpoint') {
                return;
            }
            if (node.parent && node.parent.type === 'root') {
                node.name = 'media';
                node.params = 'only screen and ' + eachParam(node.params, function (param) {
                    return (param.direction === '>=' ? 'min-' : 'max-') + (param.vertical ? 'height' : 'width') + ': ' + param.value + 'px';
                });
                return;
            }
            node.name = 'layout';
            var params = node.params.trim();
            var queue = [];
            node.params = eachParam(node.params, function (param) {
                return (param.vertical ? 'y' : 'x') + ' ' + param.direction + ' ' + param.value;
            });
        });
    };
});