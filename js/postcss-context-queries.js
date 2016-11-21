var postcss = require('postcss');
var _ = require('underscore');
var utils = require('../js/utils.js');
var messageHelpers = require("postcss-message-helpers");
module.exports = postcss.plugin('context-queries', function (opts) {
    opts = opts || {
        contexts: ['custom'],
        operators: [':', '>', '<', '==', '|=', '^=', '$=', '*='],
        attrPrefix: '[data-',
        attrJoiner: '~="',
        attrExplicitJoiner: '="',
        attrEnding: '"]',
        logResults: false,
        logTo: 'file',
        breakpointDefault: 'max'
    };
    var contexts = {};
    var logContext = function (object, feature, value) {
        if (_.has(object, feature) === false) {
            object[feature] = [];
        }
        object[feature].push(value);
        object[feature] = _.uniq(object[feature]);
        return object;
    };
    var addToContextList = function (objectA, objectB) {
        _.each(objectB, function (value, key) {
            if (_.has(objectA, key) === false) {
                objectA[key] = value;
            } else {
                objectA[key] = objectA[key].concat(objectB[key]);
                objectA[key] = _.uniq(objectA[key]);
            }
        });
    };
    var removeQuotesAndParentheses = function (string) {
        return string.replace(/([\'\"\(\)])/g, '').trim();
    };
    var cantHaveSpaces = function (string, source) {
        messageHelpers.try(function () {
            if (string.split(' ').length > 1) {
                // error. can't have spacesx
                throw new Error("error detected: " + string);
            }
        }, source);
    };
    var createSelector = function (node, componentname) {
        var contextLog = {};
        var name = node.name;
        var params = node.params;
        var selector_group = [];
        params = params.split('\n').join('').split('\t').join('');
        _.each(params.split(/\)\s*\,\s*\(/gm), function (param_group) {
            var selector = [];
            _.each(param_group.split(/\)\s?and\s?\(/gm), function (rul, index) {
                var joiner, attrSelector, prefix = '',
                    operator = _.find(opts.operators, function (operator) {
                        return rul.split(operator).length !== 1;
                    }),
                    splitArg = rul.split(operator),
                    feature = removeQuotesAndParentheses(splitArg[0]),
                    // if no operator, do something different
                    value = removeQuotesAndParentheses(splitArg[1] || ''),
                    sliced = feature.slice(0, 4);
                if (sliced === 'min-') {
                    operator = '>=';
                    feature = feature.slice(4);
                } else if (sliced === 'max-') {
                    operator = '<=';
                    feature = feature.slice(4);
                }
                // Do we need to lower-case and replace spaces in the value also?
                joiner = opts.attrJoiner;
                if (operator === '>=') {
                    prefix = 'min-';
                } else if (operator === '<=') {
                    prefix = 'max-';
                } else if (operator === '==') {
                    joiner = opts.attrExplicitJoiner;
                }
                feature = name + '-' + feature;
                feature = prefix + feature;
                feature = feature.trim();
                cantHaveSpaces(feature, node.source);
                var selector_ = [];
                _.each(value.split(/\,\s+?/gm), function (value, index) {
                    var suffix = node.parent.type === 'root' ? '' : '&';
                    var selectr = opts.attrPrefix + feature + joiner + value + opts.attrEnding;
                    cantHaveSpaces(value, node.source);
                    if (selector.length) {
                        selector_ = _.map(selector, function (selector) {
                            return selectr + selector;
                        });
                    } else {
                        selector_.push(selectr + suffix);
                    }
                    logContext(contextLog, utils.snakeToCamel(feature), value !== true && value !== false && +value === +value ? +value : value);
                });
                selector = selector_;
            });
            selector_group.push(selector.join(',\n'));
        });
        node.selector = selector_group.join(',\n');
        return contextLog;
    };
    var sterilize = function (node) {
        node.each(function (child) {
            if (child.type !== 'decl') {
                return;
            }
            if (child.parent !== node) {
                return;
            }
            child.replaceWith('.panel-content-container {\n' + child.toString() + '\n}');
        });
    };
    return function (css, result) {
        var pathArray = css.source.input.file.split('/');
        var file = {
            path: pathArray.join('/'),
            name: pathArray.pop(),
            folder: pathArray.join('/'),
            component: pathArray.pop()
        };
        var hashed = _.foldl(opts.contexts, function (memo, key) {
            memo[key] = true;
            return memo;
        }, {});
        css.walkAtRules(function (node) {
            var atRoot, selector;
            if (!hashed[node.name]) {
                return;
            }
            // sterilize
            sterilize(node);
            node.type = "rule";
            addToContextList(contexts, createSelector(node, file.component));
        });
        // _.each(opts.dump.components, function (value, which) {
        //     console.log(value, which);
        utils.component(file.component, function (component) {
            component.contexts = contexts;
        });
        // });
        // utils.makeComponent(opts.dump, file.component).contexts = contexts;
        contexts = {};
    };
});
