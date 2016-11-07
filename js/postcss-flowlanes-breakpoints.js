var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
module.exports = postcss.plugin('flowlanes-breakpoints', function (opts) {
    opts = opts || {
        flowlaneSyntax: 'flowlane',
        breakpointSyntax: 'breakpoint',
        defineFlowlaneSyntax: 'define-flowlane',
        breakpointDefault: 'max',
        attrPrefix: '[data-',
        attrJoiner: "~='",
        attrEnding: "']",
        flowlaneProps: ['min-width', 'max-width', 'min-scale', 'max-scale'],
        flowlaneDefaults: {
            breakpoints: [],
            'min-width': 0,
            'max-width': 10000,
            'min-scale': 0,
            'max-scale': 1000
        },
        dump: {}
    };
    var layouts = [];
    var breakpoints = [];
    var validWords = {
        none: true,
        any: true
    };
    var removeExtraneous = function (params) {
        return params.replace(/([\(\)])/g, '').trim();
    };
    var understandLayout = function (node, layouts) {
        var params = node.params;
        var layoutname = params.replace(/([\(\)])/g, '');
        _.each(layoutname.split(','), function (layoutname_) {
            var layoutname = layoutname_.trim();
            if (!layoutname) {
                return;
            }
            var layout = {
                name: layoutname
            };
            if (_.find(layouts, function (layout) {
                    return layout.name === layoutname;
                })) {
                utils.exception('define-layout declarations cannot have the same name');
                // error... can't declarations with multiple names
            }
            // if layout.name exists in the layout list, err out
            var fulloverwrites = {
                height: true,
                width: true
            };
            node.each(function (node) {
                var lowercased, cameled, prop = node.prop;
                var value = node.value;
                if (node.type !== 'decl') {
                    return;
                }
                value = _.map(value.split(' '), function (val) {
                    var value = +val === +val ? +val : val;
                    return fulloverwrites[prop] && !value ? 1 : value;
                });
                if (fulloverwrites[prop] && value.length > 1 && validWords[value[0]]) {
                    value[0] = 1;
                }
                layout[utils.snakeToCamel(prop)] = value;
            });
            layout.name = layoutname;
            if (_.find(layouts, function (lt) {
                    return _.isEqual(lt.height, layout.height) && _.isEqual(lt.width, layout.width);
                })) {
                utils.exception('layouts cannot have the same dimensions / dimension ranges');
                // layouts cannot have the same dimension stipulations
            }
            // if layout does not have same sizes... push
            layouts.push(layout);
        });
        node.remove();
    };
    var validateWord = function (word_) {
        var word = word_.trim();
        return validWords[word] ? word : +word;
    };
    var parseDimensions = function (param) {
        var noBrackets = param.replace(/\[|\]/igm, '').trim();
        var split = noBrackets.split('-');
        if (split.length === 1) {
            return [validateWord(split[0])];
        } else {
            return [validateWord(split[0]), validateWord(split[1])];
        }
    };
    var validDimension = function (list) {
        return list[0] === list[0] && (list.length === 2 ? list[1] === list[1] : true);
    };
    var detectLayoutParams = function (params) {
        var height, width, param = removeExtraneous(params),
            colon_split = param.split(':'),
            x_split = param.split('by');
        if (colon_split.length !== 1 || x_split.length !== 2) {
            return;
        }
        width = parseDimensions(x_split[0]);
        height = parseDimensions(x_split[1]);
        if (!validDimension(width) || !validDimension(height)) {
            return;
        }
        return [width, height];
    };
    var toString = function (param) {
        return _.isString(param) ? param : param.join(' ');
    };
    return function (css, result) {
        var pathArray = css.source.input.file.split('/');
        var file = {
            path: pathArray.join('/'),
            name: pathArray.pop(),
            folder: pathArray.join('/'),
            component: pathArray.pop()
        };
        var count = 0,
            parsedParams = [];
        css.walkAtRules(function (node) {
            var parsed, name, params = node.params;
            if (node.name === 'layout' && (parsed = detectLayoutParams(params))) {
                if (!_.find(parsedParams, function (item) {
                        return _.isEqual(item, parsed);
                    })) {
                    parsedParams.push(parsed);
                    name = 'auto-parsed' + (++count) + '';
                    node.parent.insertBefore(node, new postcss.atRule({
                        name: 'define-layout',
                        params: '(' + name + ')',
                        nodes: [new postcss.decl({
                            prop: 'width',
                            value: toString(parsed[0])
                        }), new postcss.decl({
                            prop: 'height',
                            value: toString(parsed[1])
                        })]
                    }));
                    node.params = '(name: ' + name + ')';
                }
            }
            return node;
        });
        css.walkAtRules(function (node) {
            if (node.name === 'define-layout') {
                understandLayout(node, layouts);
            }
        });
        utils.component(file.component, function (component) {
            component.layouts = layouts;
        });
        layouts = [];
    };
});