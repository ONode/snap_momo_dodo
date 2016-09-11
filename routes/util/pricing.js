/**
 * Created by zJJ on 6/22/2016.
 */
"use strict";
const ks = require('keystone');
const _ = require('lodash');
const async = require('async');
const Price = ks.list('Pricing').model;
const ProfileModel = ks.list('Profile').model;
const checker = require('./checking.js');
const output = require('./outputjson.js');
const crystal = require('crypto-js');
const moment = require('moment');
const ACCESS_CODE = 'access_token';
const getProfileId = require('./getProfileId.js');

var retrieve_price_index_list = function (req, res, finalnext) {
    const data = {
        pricelist: [],
        profile_id: null,
        photoicon: null
    };
    async.series(
        [
            function (next) {
                data.profile_id = getProfileId(req);
                if (data.profile_id == null)return next(new Error('missing id'));
                next();
            },
            function (next) {
                Price.find({listed: data.profile_id}).exec(function (err, result) {
                    if (_.isArray(result)) {
                        console.log('p', 'price list is done');
                        data.pricelist = result;
                        if (result.length > 0) {
                            var doc = result[0];
                            console.log('doc', doc);
                            ProfileModel.findOne({_id: data.profile_id}).exec(function (err, person) {
                                if (_.isArray(person.photo)) {
                                    data.photoicon = person.photo[0];
                                }
                                next();
                            });
                        } else {
                            next();
                        }
                    } else {
                        return next(new Error('There is a problem from the search'));
                    }
                });
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            console.log('p', 'output line in here');
            return output.outResSuccessWithMessage(data, 'request success', res);
        });
};
var update_price_item = function (req, res, callback_next) {
    var action = base_layer(req, res, function (req, res, data, next) {
        var _b = req.body;
        var _timelength = _.parseInt(_b["timelength"]);
        var _services = _b["services"];
        var _price = _b["price"];
        var _currency = _b["currency"];
        var _outgoing = _.parseInt(_b["outgoing"]);

        var listed = _b["listed"];
        var createdAt = _b["createdAt"];
        if (createdAt || listed) {
            return next(new Error('illegal changes'));
        }


        Price.findByIdAndUpdate(
            data.prid,
            {$set: _b},
            {safe: true},
            function (err, model) {
                if (err) {
                    return next(new Error('error is here ' + err.message));
                }
                data.updated = model;
                next();
            });

    }, true, true);
    return action.execute();
};
var remove_price_item = function (req, res, callback_next) {
    var action = base_layer(req, res, function (req, res, data, next) {
        Price.where({_id: data.prid}).findOneAndRemove(function (err) {
            if (_.isError(err)) {
                return next(err);
            } else {
                next();
            }
        });
    }, true, true);
    return action.execute();
};
var declare_price_item = function (req, res, callback_next) {
    var save_object = null;
    var actionbase = base_layer(req, res, function (req, res, data, next) {
        var _b = req.body;
        var _timelength = _.parseInt(_b["timelength"]);
        var _services = _b["services"];
        var _price = _b["price"];
        var _currency = _b["currency"];
        var _outgoing = _.parseInt(_b["outgoing"]);
        if (_timelength === 0) {

        }
        if (_services == null) {
            return next(new Error('service is empty'));
        }
        if (_price == null) {
            return next(new Error('price is empty'));
        }
        const time = new Date();
        console.log('logservice', _services);
        save_object = {
            simplefield: crystal.MD5(time.getTime()).toString(),
            timelength: _timelength,
            services: _services,
            listed: data.pid,
            price: _.parseInt(_price),
            outgoing: _outgoing == 1 ? true : false
        };

        if (_currency) {
            save_object.currency = _currency;
        }
        var execur = new Price(save_object);
        execur.save(function (err) {
            if (err) {
                console.log("p", "error from saving the new pricing item. ", err);
                return next(new Error("there is an error from saving this item. " + err.message));
            }
            data.saved = save_object;
            console.log('p', 'saved data');
            next();
        });
    }, true, false);
    return actionbase.execute();
};
/**
 * basic layer
 * @type {update_price_item}
 */

var base_layer = function (req, res, business_logic, require_profile_id, require_price_id) {
    const data = {
        pid: null,
        uid: null,
        prid: null
    };
    const b =
    {
        checking: function (next) {
            if (require_profile_id) {
                data.pid = getProfileId(req);
                if (data.pid == null)return next(new Error('missing id'));
            }
            if (require_price_id) {
                data.prid = req.params['price_id'];
                if (data.prid == null)return next(new Error('missing price id'));
            }
            next();
        },
        execute: function () {
            async.series(
                [
                    function (next) {
                        b.checking(next);
                    },
                    function (next) {
                        checker.check_token(req.get(ACCESS_CODE), function (user_id) {
                            if (_.isError(user_id)) {
                                return next(user_id);
                            } else {
                                data.uid = user_id;
                                next();
                            }
                        });
                    },
                    function (next) {
                        checker.check_profile_access_against_user_id(data.uid, data.pid, next);
                    },
                    function (next) {
                        business_logic(req, res, data, next);
                    }
                ],
                function (err, result) {
                    if (err) {
                        return output.outResErro(err.message, res);
                    }
                    console.log('p', 'output line in here');
                    return output.outResSuccessWithMessage(data, 'request success', res);
                })
        }
    };
    return b;
};
exports.pricingupdate = update_price_item;
exports.pricingremove = remove_price_item;
exports.pricingadd = declare_price_item;
exports.pricingread = retrieve_price_index_list;