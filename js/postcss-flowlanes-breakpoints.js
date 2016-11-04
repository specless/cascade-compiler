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
                if (fulloverwrites[prop] && value.length > 1 && value[0] === 'none') {
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
    return function (css, result) {
        var pathArray = css.source.input.file.split('/');
        var file = {
            path: pathArray.join('/'),
            name: pathArray.pop(),
            folder: pathArray.join('/'),
            component: pathArray.pop()
        };
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