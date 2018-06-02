"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var url_1 = require("url");
var visit = require("unist-util-visit");
var getVideoId = require('get-video-id');
var VideoServices = {
    YOUTUBE: 'youtube',
    VIMEO: 'vimeo',
    VIDEOPRESS: 'videopress'
};
var EmbedVideo = /** @class */ (function () {
    function EmbedVideo(type, id, options) {
        this.type = type;
        this.id = id;
        this.options = options;
        this.knownPlatforms = ['youtube', 'vimeo', 'videopress'];
        var defaultOptions = {
            width: 560,
            ratio: 1.77,
            related: false,
            noIframeBorder: true
        };
        this.options = __assign({}, defaultOptions, options);
        if (!this.options.height) {
            this.options.height = Math.round(this.options.width / this.options.ratio);
        }
    }
    EmbedVideo.prototype.getHTML = function () {
        try {
            var videoId = this.readVideoId();
            var url = this.createUrl(videoId.service, videoId.id);
            var iframe = this.createIframe(videoId.service, url);
            return iframe;
        }
        catch (e) {
            return "<p style=\"color: red\">Error: " + e.message + "</p>";
        }
    };
    EmbedVideo.prototype.readVideoId = function () {
        var videoId = getVideoId(this.id);
        if (videoId === undefined) {
            if (this.type === 'video') {
                throw new TypeError('Id could not be processed');
            }
            else {
                return {
                    id: this.id,
                    service: this.type.toLowerCase()
                };
            }
        }
        return videoId;
    };
    EmbedVideo.prototype.createUrl = function (service, videoId) {
        var urls = {
            youtube: "https://www.youtube.com/embed/" + videoId,
            vimeo: "https://player.vimeo.com/video/" + videoId,
            videopress: "https://videopress.com/embed/" + videoId,
        };
        var url = new url_1.URL(urls[service]);
        if (!url) {
            throw new TypeError('Unknown Video Service');
        }
        if (service === VideoServices.YOUTUBE) {
            if (this.id.startsWith("http")) {
                var originalParams = new url_1.URL(this.id);
                originalParams.searchParams.forEach(function (val, index) {
                    if (index === "v") {
                        //Skip original video Parameter
                    }
                    else {
                        if (index === "t") {
                            var times = val.match(/(\d+)/g);
                            if (times) {
                                var seconds = times.reverse()
                                    .reduce(function (total, val, index) { return total + (parseInt(val) * Math.pow(60, index)); }, 0);
                                url.searchParams.set("start", seconds.toString());
                            }
                        }
                        else {
                            url.searchParams.set(index, val);
                        }
                    }
                });
            }
            if (!this.options.related) {
                url.searchParams.set("rel", "0");
            }
        }
        return url.toString();
    };
    EmbedVideo.prototype.createIframe = function (videoPlatform, url) {
        var iframeNode = "<iframe \n              width=\"" + this.options.width + "\" \n              height=\"" + this.options.height + "\" \n              src=\"" + url + "\"\n              class=\"embedVideoIframe\" \n              allowfullscreen\n            ></iframe>";
        if (this.options.noIframeBorder) {
            iframeNode += "\n      <style>\n        .embedVideoIframe {\n          border: 0\n        }\n      </style>";
        }
        if (videoPlatform === VideoServices.VIDEOPRESS) {
            iframeNode += "<script src=\"https://videopress.com/videopress-iframe.js\"></script>";
        }
        return iframeNode;
    };
    return EmbedVideo;
}());
var addVideoIframe = function (_a, options) {
    var markdownAST = _a.markdownAST;
    visit(markdownAST, "inlineCode", function (node) {
        var value = node.value;
        var knownPlatforms = ['youtube', 'vimeo', 'videopress'];
        var keywords = knownPlatforms.concat(['video']).join('|');
        var re = new RegExp("(" + keywords + "):(.*)", 'i');
        var processValue = value.match(re);
        if (processValue) {
            var type = processValue[1];
            var id = processValue[2];
            id = id.trim();
            var embedVideo = new EmbedVideo(type, id, options);
            node.type = "html";
            node.value = embedVideo.getHTML();
        }
    });
};
module.exports = addVideoIframe;