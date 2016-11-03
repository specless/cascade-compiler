specless.content(window) //
    .plugin("__PLUGIN_ID__", function (plugin, content, _, factories, documentView, scopedFactories, $) {
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
            events: {
                click: 'toggle',
                create: 'reset',
                render: 'rebind'
            },
            unbind: function () {
                var adVideo = this;
                _.each(adVideo.ui, function (els) {
                    els.each(function (el) {
                        adVideo.stopListening(el);
                    });
                });
                adVideo.ui = adVideo.selectUI();
                return adVideo;
            },
            selectUI: function () {
                return {
                    video: this.$('video').item(0)
                };
            },
            rebind: function () {
                var adVideo = this;
                adVideo.unbind();
                adVideo.listenTo(adVideo.ui.video, {
                    ended: 'restart'
                });
            },
            pause: toggles('pause'),
            play: toggles('play', true),
            restart: function () {
                this.pause();
                this.seek(0);
            },
            seek: function (sets) {
                var videoEl = this.ui.video.element(),
                    read = videoEl.currentTime;
                if (sets == NULL) {
                    return read;
                }
                videoEl.currentTime = sets;
                return this;
            },
            reset: function () {
                var adVideo = this;
                adVideo.data({
                    interactive: true
                });
                adVideo.html(adVideo.template());
                var doit = function () {
                    videojs(adVideo.ui.video.element(), {}, function (e) {
                        var registry = adVideo.directive('Registry');
                        adVideo.vjs = this;
                        registry.get('elements', 'vjs-overwrites', overwritevjsdimensions);
                    });
                };
                _.Promise(function (s, f) {
                    if (content.is('userJsRunning')) {
                        doit();
                    } else {
                        content.on('userjs:running', doit);
                    }
                });
            },
            toggle: function () {
                if (this.is('playing')) {
                    return this.pause();
                } else {
                    return this.play();
                }
            },
            template: function () {
                return [
                    ['video', {
                        src: this.attr('src'),
                        poster: this.attr('poster')
                    }]
                ];
            }
        });
    });