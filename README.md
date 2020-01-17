# example-firebase-loopback

An example about pushing notification for devices.

## Information

- Build API service by loopback 3.x
- Using mongodb for storing.
- Using npm packages here: 

- fcm-node: https://github.com/jlcvp/fcm-node
- loopback-connector-mongodb
- asyncawait

- Apply firebase to push notification for devices

## Detail & testing

- Register information in Google Firebase Cloud Messaging. Get `serverKey` from setting of firebase console for application.
- Run command: `npm install` at the project folder to install all dependencies.
- Run command: `node .` at the project folder.
- Browse system with url http://localhost:3000/explorer in browser.
- In order to push notification, we must have tables for storing neccessary information of application, device, and message.
- Create an application by explorer url with `id` is package name of software that installed on device. `serverKey` is got from Google Firebase Cloud Messaging.
- Create an device by explorer url with unique `deviceToken`.
- Create and push notification by explorer for testing.
- Android was tested and push notify successfully, 2 remain platforms are not tested yet.

## Sample code

In common/models/notification.js, create an API `pushNotifies` with public url `/notifications/push-notifies` as below:

```js
Notification.remoteMethod('pushNotifies', {
    accepts: [
        {arg: 'notify', type: 'object', require: true},
        {arg: 'userIds', type: ['string'], require: true}
    ],
    returns: {root: true},
    http: {path: '/push-notifies', verb: 'post'}
});

Notification.pushNotifies = async((notify, userIds) => {
    //process create and push here
}
```

Create module `sendNotifySystem.js` in server/modules/ folder.
In this module, using `fcm-node` package:

```js
let FCM = require('fcm-node');
```

Coding for push function in `sendNotifySystems.js`:

```js
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
```

Using this `push` function when process `pushNotifies` in model `notification` like that:

```js
Notification.create(notify, function(err, data) {
    if (err) return {result: FAIL_RESULT, msg: 'can not create notification'};

    sendNotifySystem.push(data, devices, serverKey, function (err, result) {
        let status;
        if(result.success == 0 || err !== null) {
            status = Notification.statusType.failed;
        } else {
            status = Notification.statusType.delivered;
        }

        data.updateAttributes(
            {
                status: status,
                process: (notify.process + devices.length),
                success: (parseInt(result.success) + notify.success),
                fail: (parseInt(result.fail) + notify.fail)
            }, function (e, n) {
                if (e) {
                    return {result: FAIL_RESULT, msg: e};
                }
            }
        );
    });
});
```
