module.exports = {
    "name": "ad-video",
    "company": "specless",
    "version": "1.0.0",
    "tag": "ad-video",
    "id": "adlalsdjfowhsah0-aoiiw29s-asd8-as8n",
    "assets": {
        "js": {
            "video-js": {
                "src": "https://vjs.zencdn.net/5.8.8/video.min.js"
            },
            "three-js": {
                "src": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r76/three.js"
            },
            "pano-wrapper": {
                "src": "pano-wrapper.js"
            }
        },
        "css": {
            "styles": {
                "href": "styles-cascade.css"
            },
            "generic": {
                "href": "styles.css"
            },
            "video-js": {
                "href": "http://vjs.zencdn.net/5.11.9/video-js.css"
            }
        }
    },
    "dependencies": {
        "defaults": [{
            "js": ["video-js"],
            "css": ["video-js", "generic", "styles"]
        }],
        "panoramic": [{
            "js": ["video-js", "three-js", "pano-wrapper"],
            "css": ["generic", "styles"]
        }]
    }
};