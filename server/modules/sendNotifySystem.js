'use strict';

let FCM = require('fcm-node');

const platforms = {
    Android: 0,
    iOS: 1,
    webpush: 2
};

let sendNotifySystem = function() {
    this.fcm;
    
    this.initFCM = function(serverKey) {
        this.fcm = new FCM(serverKey);
    };

    this.generateMessage = function(notify, devices) {
        let message = {};
        let deviceType, tokens;

        if(devices.length > 1) {
            //all device must have the same deviceType
            devices = devices[0].deviceType;
            tokens = devices.map(d => d.deviceToken);
            tokens = [...new Set(tokens)];
            message.registration_ids = tokens;
        } else {
            deviceType = devices[0].deviceType;
            tokens = devices[0].deviceToken;
            message.to = tokens;
        }

        switch (deviceType) {
            case platforms.Android:
                message.data = {
                    deeplink: notify.deeplink,
                    priority: notify.priority
                };
                message.notification = {
                    title: notify.title,
                    body: notify.message,
                    sound: notify.soundName ? notify.soundName : 'default'
                };
                break;
            case platforms.iOS:
                //not check
                message.data = {
                    sound: notify.soundName
                };
                message.apns = {
                    payload: {
                        aps: {
                            alert: {
                                title: notify.title,
                                body: notify.message,
                                sound: notify.soundName
                            },
                            badge: 1
                        }
                    }
                }
                break;
            case platforms.webpush:
                //not check
                message.notification = {
                    title: notify.title,
                    body: notify.message
                };
                message.webpush = {
                    fcm_options: {
                        link: ""
                    }
                };
                break;
            default:
                return null;
        }
        return message;
    };
};

sendNotifySystem.prototype.platforms = platforms;

sendNotifySystem.prototype.push = function(notify, devices, serverKey, callback) {
    let message = this.generateMessage(notify, devices);
    this.initFCM(serverKey);

    if(!message) return callback('devices is not support');

    this.fcm.send(message, function(err, response) {
        if(err) {
            return callback(err, {success: 0, fail: 1});
        }

        response = JSON.parse(response);
        
        return callback(null, {response: response, success: response.success, fail: response.failure});
    });
};

module.exports = new sendNotifySystem();