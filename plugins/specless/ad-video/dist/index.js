specless.content(window) //
    .plugin("__PLUGIN_ID__", function (plugin, content, _, factories, DOMA) {
        var NULL = null,
            toggles = function (key, bool) {
                return function (e) {
                    var adVideo = this;
                    adVideo.playing = bool;
                    return _.Promise(function (s, f) {
                        var p = adVideo.ui.video[key]();
                        if (p && _.isPromise(p)) {
                            p.then(s).catch(f);
                        } else {
                            s();
                        }
                    });
                };
            };
        content.loadAdElement('video').extend({
            lifecycle: {
                attributeChanged: function (attr, old, updated) {},
                attached: function () {},
                detached: function () {},
                created: function () {
                    this.reset();
                }
            },
            events: {
                click: 'toggle'
            },
            methods: {
                selectUI: function () {
                    return {
                        video: this.querySelectorAll('video')[0]
                    };
                },
                pause: toggles('pause'),
                play: toggles('play', true),
                restart: function () {
                    var ui, adVideo = this;
                    if (!adVideo.setup) {
                        adVideo.setup = true;
                        ui = adVideo.ui = adVideo.selectUI();
                        ui.video.addEventListener('ended', function () {
                            adVideo.restart();
                        });
                    }
                    adVideo.pause();
                    adVideo.seek(0);
                },
                seek: function (sets) {
                    var videoEl = this.ui.video,
                        read = videoEl.currentTime;
                    if (sets == NULL) {
                        return read;
                    }
                    videoEl.currentTime = sets;
                    return this;
                },
                reset: function () {
                    var adVideo = this;
                    adVideo.setAttribute('data-interactive', '');
                    adVideo.innerHTML = DOMA.HTML.build(adVideo.template());
                    adVideo.restart();
                    var doit = function () {
                        videojs(adVideo.ui.video, {}, function (e) {
                            adVideo.vjs = this;
                            var created = DOMA.createElement('style', {}, '#' + adVideo.vjs.id() + ' { height: 100%; width: 100%; }');
                            DOMA('head').append(created);
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
                    return this.playing ? this.pause() : this.play();
                },
                template: function () {
                    return [
                        ['video', {
                            src: this.getAttribute('src'),
                            poster: this.getAttribute('poster')
                        }]
                    ];
                }
            }
        });
    });
