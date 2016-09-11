/**
 * Created by zJJ on 4/16/2016.
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
const creditsys = require('./creditsystem.js');
const ProfileModel = ks.list('Profile').model;
const mongoose = require('mongoose');
var image_upload_after = function (req, res, next) {
    checker.check_token(req.get(ACCESS_CODE), function (user_id) {
        if (_.isError(user_id)) {
            return output.outResErro(user_id.message, res);
        } else {
            image_upload_after_process("photo", user_id, req, res, next);
        }
    });
};
var image_upload_after_featured = function (req, res, next) {
    checker.check_token(req.get(ACCESS_CODE), function (user_id) {
        if (_.isError(user_id)) {
            return output.outResErro(user_id.message, res);
        } else {
            image_upload_after_process("photo_feature", user_id, req, res, next);
        }
    });
};
var image_upload_after_single = function (req, res, next) {
    checker.check_token(req.get(ACCESS_CODE), function (user_id) {
        if (_.isError(user_id)) {
            return output.outResErro(user_id.message, res);
        } else {
            image_upload_after_process("photo_profile", user_id, req, res, next);
        }
    });
};
var myCloudinary = mongoose.Schema({
    public_id: String,
    version: Number,
    signature: String,
    format: String,
    resource_type: String,
    url: String,
    width: Number,
    height: Number,
    secure_url: String
});

var add_field_str = function (field, req, input) {
    var _b = req.body;
    var defined = _b[input];
    if (!_.isNull(defined)) {
        field = defined;
    } else {
        console.log("error", "skipped field @" + input + " because there is no input or error");
    }
};
var add_field_int = function (field, req, input) {
    var _b = req.body;
    var defined = _b[input];
    if (!_.isNull(defined)) {
        field = _.parseInt(defined);
    } else {
        console.log("error", "skipped field @" + input + " because there is no input or error");
    }
};

var image_upload_after_process = function (fieldAt, userId, req, res, nextfinal) {
    var profile_id = getProfileId(req);
    console.log("re data now", {
        user_id_by_token: userId,
        profile: profile_id
    });
    var cache_local = {
        user_id_by_token: userId,
        profile_id: profile_id,
        _profile_ob: null,
        _user_credit: 0,
        _user_remain: 0,
        system: null
    };
    async.series([
        function (next) {
            checker.check_profile_access_against_user_id(userId, profile_id, next);
        },
        function (next) {
            if (_.eq(fieldAt, "photo")) {
                //upload the regular free for all image for our own
                cache_local._update_command = {$push: {"photo": req.body}};
            }
            if (_.eq(fieldAt, "photo_feature")) {
                //upload the featured photo image
                cache_local._update_command = {$push: {"photofeature": req.body}};
                cache_local._user_credit = _.parseInt(ks.get('upload_feature_image_fee'));
            }
            if (_.eq(fieldAt, "photo_profile")) {
                //upload the head profile image
                cache_local._update_command = {$set: {"photoprofile": req.body}};
                cache_local._user_credit = _.parseInt(ks.get('upload_change_head_image_fee'));
            }
            console.log('usercredit', cache_local._user_credit);
            next();
        },
        function (next) {
            if (cache_local._user_credit > 0) {
                cache_local.system = creditsys.useCredit(cache_local._user_credit, userId, next, 'image upload');
                cache_local.system.exe();
            } else {
                next();
            }
        },
        function (next) {
            if (cache_local._user_credit > 0) {
                cache_local._user_remain = cache_local.system.remain;
            }
            ProfileModel.findByIdAndUpdate(
                profile_id,
                cache_local._update_command,
                {safe: true, upsert: true},
                function (err, model) {
                    if (err) {
                        console.log(err);
                        return next(new Error("error is here " + err.message));
                    }
                    next();
                });
        }
    ], function (err, result) {
        if (err) {
            return output.outResErro(err.message, res);
        }
        delete cache_local._profile_ob;
        delete cache_local.system;
        delete cache_local._update_command;
        console.log("profile_ob", "output line in here");
        return output.outResSuccessWithMessage(cache_local, "image update success", res);
    });
};
exports.cloudinary_update_image = image_upload_after;
exports.cloudinary_update_image_featured = image_upload_after_featured;
exports.cloudinary_update_image_profile = image_upload_after_single;
