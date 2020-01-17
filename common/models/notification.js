'use strict';

let async = require('asyncawait/async');
let await = require('asyncawait/await');
let sendNotifySystem = require('../../server/modules/sendNotifySystem');

module.exports = function(Notification) {
    Notification.statusType = {
        pending: 0,
        delivered: 1,
        failed: 2,
        cancelled: 3,
        processing: 4
    };

    const FAIL_RESULT = 0;
    const SUCCESS_RESULT = 1;

    Notification.remoteMethod('pushNotifies', {
        accepts: [
            {arg: 'notify', type: 'object', require: true},
            {arg: 'userIds', type: ['string'], require: true}
        ],
        returns: {root: true},
        http: {path: '/push-notifies', verb: 'post'}
    });

    Notification.pushNotifies = async((notify, userIds) => {
        let app = Notification.app;
        let devices, msg = '';

        if(notify == undefined || !notify || typeof userIds != 'object') {
            msg += 'invalid notify ';
        }

        if(userIds == undefined || !userIds || typeof userIds != 'object') {
            msg += 'invalid userIds ';
        }

        if(msg.length > 0)
            return {result: FAIL_RESULT, msg: msg};
        
        notify.userIds = userIds;
        notify.pushDate = new Date();

        devices = await(app.models.Device.find({where: {userId: {inq: userIds}, appId: notify.appId}}));

        if(!devices || devices.length == 0)
            return {result: FAIL_RESULT, msg: 'device not found'};
        
        let serverKey = await(app.models.Application.findOne({fields: {serverKey: true}, where: {id: notify.appId}}));
        serverKey = serverKey.serverKey;

        if(!serverKey)
            return {result: FAIL_RESULT, msg: 'server key not found'};

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
    });
    return {result: SUCCESS_RESULT};
};

