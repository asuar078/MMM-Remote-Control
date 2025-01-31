/* global Module, Log, MM, config */

/* Magic Mirror
 * Module: Remote Control
 *
 * By Joseph Bethge
 * MIT Licensed.
 */

/* jshint esversion:6 */

Module.register("MMM-Remote-Control", {

    requiresVersion: "2.12.0",

    // Default module config.
    defaults: {
        customCommand: {}
    },

    // Define start sequence.
    start: function () {
        Log.info("Starting module: " + this.name);

        this.settingsVersion = 2;

        this.addresses = {};
        this.port = '';

        this.brightness = 100;

        this.updateIpAddress();
        this.scanInterval = setInterval(
            this.updateIpAddress.bind(this),
            30 * 1000);
    },

    getStyles: function () {
        return ["remote-control.css", "MMM-Remote-Control.css"];
    },

    getScripts: function() {
        return ["qrcode.min.js"];
    },

    updateIpAddress: function () {
        this.sendSocketNotification("GET_IP_ADDRESSES");
    },

    notificationReceived: function (notification, payload, sender) {
        Log.log(this.name + " received a module notification: " + notification);
        if (notification === "DOM_OBJECTS_CREATED") {
            this.sendSocketNotification("REQUEST_DEFAULT_SETTINGS");
            this.sendCurrentData();
        }
        if (notification === "REMOTE_ACTION") {
            this.sendSocketNotification(notification, payload);
        }
        if (notification === "REGISTER_API") {
            this.sendSocketNotification(notification, payload);
        }
        if (notification === "USER_PRESENCE") {
            this.sendSocketNotification(notification, payload);
        }
    },

    // Override socket notification handler.
    socketNotificationReceived: function (notification, payload) {
        Log.log(this.name + " received a socket notification: " + notification);
        if (notification === "UPDATE") {
            this.sendCurrentData();
        }
        // if (notification === "IP_ADDRESSES") {
        //     this.addresses = payload;
        //     if (this.data.position) {
        //         this.updateDom();
        //     }
        // }
        if (notification === "GET_IP_ADDRESSES") {
            this.addresses = payload;
            if (this.data.position) {
                this.updateDom();
            }
        }
        if (notification === "LOAD_PORT") {
            this.port = payload;
            if (this.data.position) {
                this.updateDom();
            }
        }

        if (notification === "USER_PRESENCE") {
            this.sendNotification(notification, payload);
        }
        if (notification === "DEFAULT_SETTINGS") {
            let settingsVersion = payload.settingsVersion;

            if (settingsVersion === undefined) {
                settingsVersion = 0;
            }
            if (settingsVersion < this.settingsVersion) {
                if (settingsVersion === 0) {
                    // move old data into moduleData
                    payload = {moduleData: payload, brightness: 100};
                }
            }

            let moduleData = payload.moduleData;
            let hideModules = {};
            for (let i = 0; i < moduleData.length; i++) {
                for (let k = 0; k < moduleData[i].lockStrings.length; k++) {
                    if (moduleData[i].lockStrings[k].indexOf("MMM-Remote-Control") >= 0) {
                        hideModules[moduleData[i].identifier] = true;
                        break;
                    }
                }
            }

            let modules = MM.getModules();

            let options = {lockString: this.identifier};

            modules.enumerate(function (module) {
                if (hideModules.hasOwnProperty(module.identifier)) {
                    module.hide(0, options);
                }
            });

            this.setBrightness(payload.brightness);
        }
        if (notification === "BRIGHTNESS") {
            this.setBrightness(parseInt(payload));
        }
        if (notification === "REFRESH") {
            document.location.reload();
        }
        if (notification === "RESTART") {
            setTimeout(function () {
                document.location.reload();
                console.log('Delayed REFRESH');
            }, 60000);
        }
        if (notification === "SHOW_ALERT") {
            this.sendNotification(notification, payload);
        }
        if (notification === "HIDE_ALERT") {
            this.sendNotification(notification);
        }
        if (notification === "MIFLORA_SCAN") {
            this.sendNotification(notification, payload)
        }
        if (notification === "HIDE" || notification === "SHOW" || notification === "TOGGLE") {
            let options = {lockString: this.identifier};
            if (payload.force) {
                options.force = true;
            }
            let modules = []
            if (payload.module !== 'all') {
                if (!Array.prototype.find) {
                    // https://tc39.github.io/ecma262/#sec-array.prototype.find
                    Object.defineProperty(Array.prototype, "find", {
                        value: function (r) {
                            if (null == this) throw new TypeError('"this" is null or not defined');
                            var e = Object(this), t = e.length >>> 0;
                            if ("function" != typeof r) throw new TypeError("predicate must be a function");
                            for (var n = arguments[1], i = 0; i < t;) {
                                var o = e[i];
                                if (r.call(n, o, i, e)) return o;
                                i++
                            }
                        }, configurable: !0, writable: !0
                    });
                }
                let i = MM.getModules().find(m => {
                    if (m) {
                        return (payload.module.includes(m.identifier));
                    }
                });
                if (!i) {
                    modules = MM.getModules().filter(m => {
                        if (m) {
                            return (payload.module.includes(m.name));
                        }
                    });
                } else modules.push(i)
            } else {
                modules = MM.getModules()
            }
            if (!modules.length) {
                return;
            }
            modules.forEach((mod) => {
                if (notification === "HIDE" ||
                    (notification === "TOGGLE" && !mod.hidden)) {
                    mod.hide(1000, options);
                } else if (notification === "SHOW" ||
                    (notification === "TOGGLE" && mod.hidden)) {
                    mod.show(1000, options);
                }
            });
        }
        if (notification === "NOTIFICATION") {
            this.sendNotification(payload.notification, payload.payload);
        }
    },

    buildCssContent: function (brightness) {
        var css = "";

        var defaults = {
            "body": parseInt("aa", 16),
            "header": parseInt("99", 16),
            ".dimmed": parseInt("66", 16),
            ".normal": parseInt("99", 16),
            ".bright": parseInt("ff", 16)
        };

        for (var key in defaults) {
            var value = defaults[key] / 100 * brightness;
            value = Math.round(value);
            value = Math.min(value, 255);
            if (value < 16) {
                value = "0" + value.toString(16);
            } else {
                value = value.toString(16);
            }
            var extra = "";
            if (key === "header") {
                extra = "border-bottom: 1px solid #" + value + value + value + ";";
            }
            css += key + " { color: #" + value + value + value + "; " + extra + "} ";
        }
        return css;
    },

    setBrightness: function (newBrightnessValue) {
        if (newBrightnessValue < 10) {
            newBrightnessValue = 10;
        }
        if (newBrightnessValue > 200) {
            newBrightnessValue = 200;
        }

        this.brightness = newBrightnessValue;

        var style = document.getElementById('remote-control-styles');
        if (!style) {
            // create custom css if not existing
            style = document.createElement('style');
            style.type = 'text/css';
            style.id = 'remote-control-styles';
            var parent = document.getElementsByTagName('head')[0];
            parent.appendChild(style);
        }

        if (newBrightnessValue < 100) {
            style.innerHTML = "";
            this.createOverlay(newBrightnessValue);
            return;
        }
        if (newBrightnessValue > 100) {
            style.innerHTML = this.buildCssContent(newBrightnessValue);
            this.removeOverlay();
            return;
        }
        // default brightness
        style.innerHTML = "";
        this.removeOverlay();
    },

    createOverlay: function (brightness) {
        var overlay = document.getElementById('remote-control-overlay');
        if (!overlay) {
            // if not existing, create overlay
            overlay = document.createElement("div");
            overlay.id = "remote-control-overlay";
            var parent = document.body;
            parent.insertBefore(overlay, parent.firstChild);
        }
        var bgColor = "rgba(0,0,0," + (100 - brightness) / 100 + ")";
        overlay.style.backgroundColor = bgColor;
    },

    removeOverlay: function () {
        var overlay = document.getElementById('remote-control-overlay');
        if (overlay) {
            var parent = document.body;
            parent.removeChild(overlay);
        }
    },

    getIpToShow: function () {

        if (this.addresses["eth0"]) {
            if (this.addresses["eth0"][0]) {
                return this.addresses["eth0"][0];
            }
        }

        if (this.addresses["wlan1"]) {
            if (this.addresses["wlan1"][0]) {
                return this.addresses["wlan1"][0];
            }
        }

        if (this.addresses["wlan0"]) {
            if (this.addresses["wlan0"][0]) {
                return this.addresses["wlan0"][0];
            }
        }


        return "ip-of-your-mirror";
    },

    getDom: function () {
        // const wrapper = document.createElement("div");
        let portToShow = ''
        let ipToShow = this.getIpToShow();

        switch (this.port) {
            case '':
            case '8080':
                portToShow = ':8080';
                break;
            case '80':
                portToShow = '';
                break;
            default:
                portToShow = ':' + this.port;
                break;
        }
        const textToShow = "http://" + ipToShow  + portToShow + "/remote.html";

        const wrapperEl = document.createElement("div");
        wrapperEl.classList.add('qrcode');

        const qrcodeEl  = document.createElement("div");
        new QRCode(qrcodeEl, {
            text: textToShow,
            width: 100,
            height: 100,
            colorDark : "#fff",
            colorLight : "#000",
            correctLevel : QRCode.CorrectLevel.H
        });

        const imageEl  = document.createElement("div");
        imageEl.classList.add('qrcode_image');
        imageEl.appendChild(qrcodeEl);

        wrapperEl.appendChild(imageEl);

        const textEl = document.createElement("div");
        textEl.classList.add('qrcode_text');
        textEl.innerHTML = textToShow;
        wrapperEl.appendChild(textEl);

        return wrapperEl;

        // wrapper.innerHTML = "http://" + ipToShow  + portToShow + "/remote.html";
        // wrapper.className = "normal xsmall";
        // return wrapper;
    },

    sendCurrentData: function () {
        var self = this;

        var modules = MM.getModules();
        var currentModuleData = [];
        modules.enumerate(function (module) {
            let modData = Object.assign({}, module.data);
            modData.hidden = module.hidden;
            modData.lockStrings = module.lockStrings;
            modData.config = module.config;
            currentModuleData.push(modData);
        });
        var configData = {
            moduleData: currentModuleData,
            brightness: this.brightness,
            settingsVersion: this.settingsVersion,
            remoteConfig: this.config
        };
        this.sendSocketNotification("CURRENT_STATUS", configData);
    }
});
