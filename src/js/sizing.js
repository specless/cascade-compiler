(function (fn) {
    var global_ = window,
        EMPTY_STRING = '',
        LENGTH = 'length',
        LOCATION = 'location',
        PUSH = 'push',
        BOOLEAN_TRUE = true,
        BOOLEAN_FALSE = false,
        parse_search = function (search_) {
            var parms, temp, items, val, converted, i = 0,
                search = search_,
                dcUriComp = global_.decodeURIComponent;
            if (typeof search !== 'string') {
                search = search[LOCATION].search;
            }
            if (search[0] === '?') {
                search = search.slice(1);
            }
            items = search.split('&');
            parms = {};
            for (; i < items[LENGTH]; i++) {
                temp = items[i].split('=');
                if (temp[0]) {
                    if (temp[LENGTH] < 2) {
                        temp[PUSH](EMPTY_STRING);
                    }
                    val = temp[1];
                    val = dcUriComp(val);
                    if (val[0] === "'" || val[0] === '"') {
                        val = val.slice(1, val[LENGTH] - 1);
                    }
                    if (val === BOOLEAN_TRUE + EMPTY_STRING) {
                        val = BOOLEAN_TRUE;
                    }
                    if (val === BOOLEAN_FALSE + EMPTY_STRING) {
                        val = BOOLEAN_FALSE;
                    }
                    if (typeof val === 'string') {
                        converted = +val;
                        if (converted == val && converted + EMPTY_STRING === val) {
                            val = converted;
                        }
                    }
                    parms[dcUriComp(temp[0])] = val;
                }
            }
            return parms;
        };
    fn(parse_search(window), (function () {
        var formerConstrains;

        function maintainAspect(iframe, aspect, constraints, done) {
            var constrained = constraints();
            if (formerConstrains && constrained.width === formerConstrains.width && constrained.height === formerConstrains.height) {
                return done();
            }
            var appliedHeight, appliedWidth,
                windowAspect = constrained.width / constrained.height;
            formerConstrains = constrained;
            if (windowAspect > aspect) {
                appliedHeight = '100%';
                appliedWidth = (constrained.height * aspect) + 'px';
            } else {
                appliedWidth = '100%';
                appliedHeight = (constrained.width / aspect) + 'px';
            }
            done({
                height: appliedHeight,
                width: appliedWidth
            });
        }
        return function calls(iframe, aspect, constraints, sets) {
            maintainAspect(iframe, aspect, constraints, function (dimensions) {
                sets(iframe, dimensions);
                requestAnimationFrame(calls.bind(null, iframe, aspect, constraints, sets));
            });
        };
    }()), function (iframe, dims) {
        if (!dims || !iframe) {
            return;
        }
        iframe.style.height = dims.height;
        iframe.style.width = dims.width;
    });
}(function (parsed, maintainAspect, setDimensions) {
    var iframe = window.ad,
        size = parsed.size || 'full',
        sizeList = size.split('by'),
        width = sizeList[0],
        height = sizeList[1] || width,
        widthIsAspect = +width === +width,
        heightIsAspect = +height === +height;
    if (widthIsAspect && heightIsAspect) {
        return maintainAspect(iframe, width / height, function () {
            return {
                height: innerHeight,
                width: innerWidth
            };
        }, setDimensions);
    }
    return setDimensions(iframe, {
        width: width,
        height: height
    });
}));