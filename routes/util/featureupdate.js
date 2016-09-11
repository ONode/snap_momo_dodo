/**
 * Created by zJJ on 4/20/2016.
 */
"use strict";
const ks = require('keystone');
const _ = require('lodash');
const async = require('async');
const ObjectIdAction = ks.mongoose.Types.ObjectId;
const checker = require('./checking.js');
const output = require('./outputjson.js');
const crystal = require('crypto-js');
const moment = require('moment');
const restfulutil = require('restful-keystone-onode/lib/utils/');
const ACCESS_CODE = 'access_token';
const getProfileId = require('./getProfileId.js');
const mongoose = require('mongoose');
const Profile = ks.list('Profile').model;
const Features = ks.list('Feature').model;

var ft_update = function (req, res, nex) {
    var cache_local = {
        usrid: ''
    };
    async.series([
        function (next) {
            checker.check_token(req.get(ACCESS_CODE), function (user_id) {
                if (_.isError(user_id)) {
                    return next(new Error(user_id));
                } else {
                    cache_local.usrid = _.trim(user_id);
                    next();
                }
            });
        }
    ], function (next) {
        cache_local.profile_id = getProfileId(req);
        checker.check_profile_access_against_user_id(cache_local.usrid, cache_local.profile_id, next);
    }, function (next) {
        Profile.findByIdAndUpdate(
            cache_local.profile_id,
            {$push: {'features': req.body}},
            {safe: true, upsert: true},
            function (err, model) {
                if (err) {
                    console.log(err);
                    return next(new Error('error is here ' + err.message));
                }
                next();
            });
    }, function (err, result) {
        if (err) {
            return output.outResErro(err.message, res);
        }
        console.log('profile_ob', 'output line in here');
        return output.outResSuccessWithMessage(cache_local, 'image update success', res);
    });
};
var list_by_profile_id = function (req, res, next) {
    var cache_local = {
        arrayid: [],
        count: 0,
        profile_id: '',
        usrid: ''
    };
    async.series(
        [
            function (next) {
                checker.check_token(req.get(ACCESS_CODE), function (user_id) {
                    cache_local.usrid = _.trim(user_id);
                    next();
                });
            },
            function (next) {
                cache_local.profile_id = getProfileId(req);
                checker.check_profile_access_against_user_id(cache_local.usrid, cache_local.profile_id, next);
            },
            function (next) {
                Profile.findOne({
                    _id: cache_local.profile_id
                }).exec(function (err, result) {
                    if (err) {
                        console.log(err);
                        return next(new Error('error is here ' + err.message));
                    }
                    if (!_.isNull(result.features)) {
                        cache_local.count = _.size(result.features);
                        if (cache_local.count > 0) {
                            _.forEach(result.features, function (feature) {
                                cache_local.arrayid.push(feature);
                            });
                        }
                        // console.log('featurelist', result.features);
                    } else {
                        cache_local.count = 0;
                    }
                    next();
                });
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            console.log('profile_ob', 'output line in here');
            return output.outResSuccessWithMessage(cache_local, 'request success', res);
        });
};
/**
 * increase the like count in here
 * @param req  from express
 * @param res from express
 * @param done next tick
 */
var proposelike = function (req, res, done) {
    var cache_local = {
        profile_id: '',
        totalcount: -1,
        instruction: null
    };
    async.series(
        [
            function (next) {
                cache_local.profile_id = getProfileId(req);
                if (cache_local.profile_id == null) return next(new Error('profile id is not defined.'));
                next();
            },
            function (next) {
                Profile.findOne({
                    _id: cache_local.profile_id
                }).exec(function (err, doc) {
                    if (_.isError(err)) {
                        console.log(err);
                        return next(err);
                    }
                    if (_.isNull(doc)) {
                        return next(new Error("this profile is not exist"));
                    }
                    if (_.isNull(doc.likecount)) {
                        cache_local.instruction = {$set: {'likecount': 1}};
                    } else {
                        cache_local.instruction = {$inc: {'likecount': 1}};
                    }
                    next();
                });
            },
            function (next) {
                Profile.findByIdAndUpdate(
                    cache_local.profile_id,
                    cache_local.instruction,
                    {safe: true, upsert: false},
                    function (err, model) {
                        if (_.isError(err)) {
                            console.log(err);
                            return next(err);
                        }
                        cache_local.totalcount = model.likecount;
                        delete cache_local.instruction;
                        next();
                    });
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            return output.outResSuccessWithMessage(cache_local, 'positive update', res);
        });
};
var list_feature_update = function (req, res, done) {
    var cache_local = {
        arrayid: [],
        profile_id: ''
    };
    async.series(
        [
            function (next) {
                checker.check_token(req.get(ACCESS_CODE), function (user_id) {
                    cache_local.usrid = _.trim(user_id);
                    next();
                });
            },
            function (next) {
                cache_local.profile_id = getProfileId(req);
                checker.check_profile_access_against_user_id(cache_local.usrid, cache_local.profile_id, next);
            },
            function (next) {

                console.log("update items", req.body.update);
                Profile.findByIdAndUpdate(
                    cache_local.profile_id,
                    {$set: {'features': req.body.update}},
                    {safe: true, upsert: true},
                    function (err, model) {
                        if (err) {
                            console.log(err);
                            return next(new Error('error is here ' + err.message));
                        }
                        next();
                    });
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            console.log('profile_ob', 'output line in here');
            return output.outResSuccessWithMessage(cache_local, 'this update request is positive', res);
        });
};
exports.update_features_me = list_feature_update;
exports.list_ft_profile_me = list_by_profile_id;
exports.addlike = proposelike;