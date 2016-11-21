specless.content(window) //
    .plugin("__PLUGIN_ID__", function (plugin, content, _, factories, $) {
        var NULL = null,
            toggles = function (key, bool) {
                return function (e) {
                    var adVideo = this;
                    adVideo.remark('playing', bool);
                    return _.Promise(function (s, f) {
                        var p = adVideo.ui.video[key]();
                        if (p && _.isPromise(p)) {
                            p.then(s).catch(f);
                        } else {
                            s();
                        }
                    });
                };
            },
            overwritevjsdimensions = function (registry) {
                var created, target = registry.target;
                if (!target.vjs) {
                    return;
                }
                created = $.createElement('style', {
                    type: 'text/css'
                }, '#' + target.vjs.id() + ' { height: 100%; width: 100%; }');
                $('head').append(created);
                return created;
            };
        content.loadAdElement('video').extend({
            lifecycle: {
                created: function () {
                    console.log('created');
                    var src = this.getAttribute('src');
                    this.setAttribute('data-src', src);
                },
                attributeChanged: function () {
                    console.log('attributeChange');
                },
                attached: function () {
                    console.log('attached');
                },
                detached: function () {
                    console.log('detached');
                }
            },
            events: {
                click: 'clomp'
            },
            methods: {
                clomp: function () {
                    console.log('clomped');
                },
                play: function () {}
            }
        });
    });
// var item = DOMA('#idovadivdeo').item(0);
// item.reset();
// item.is('playing'); // true
// item.reset(); //
// item.is('playing'); // false
