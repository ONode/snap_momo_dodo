"use strict";
/**
 * Created by zJJ on 4/5/2016.
 */
const jwt = require('jwt-simple');
const ks = require('keystone');
const _ = require('lodash');
const output = require('./outputjson.js');
const lisence_checker = require('hkm-simple-vercheck').hkmverchecker;
const ACCESS_CODE = 'access_token';
const Tokenized_model = ks.list('Tokenized').model;
/**
 * using this to check the input parameters
 * @param Query
 * @param checkArr
 * @returns {*}
 */
exports.url_param_checker = function (Query, checkArr) {
    _.each(checkArr, function (paramname) {
        if (!Query[paramname]) throw Error(paramname + " is missing.");
    });
    return Query;
};

/**
 * check the version of the software
 * @param declared_version
 * @param latest_version
 * @returns {{message: *, version: *}}
 */
exports.check_version = function (declared_version, latest_version) {
    var checker = new lisence_checker(declared_version, latest_version);
    return {
        message: checker.getMessage(),
        version: checker.getVersionFinal()
    }
};
/**
 *
 * @param model string
 * @param fieldname string
 * @param report_field_name string
 * @param checkInput check content
 * @param result_store save the values
 * @param nextaysnctask callback
 */
const internal_check_process = function (model, fieldname, report_field_name, checkInput, result_store, nextaysnctask) {
    if (!_.isString(model))throw new Error("model needs to be string");
    var query = ks.list(model).model.find();
    query.where(fieldname, checkInput);
    query.exec(function (err, result) {
        if (!result) {
            result_store.db_not_found = false;
        } else {
            result_store.db_not_found = result.length == 0;
        }
        console.log("check result for " + report_field_name, result_store.db_not_found);
        nextaysnctask(null, true);
    });
};
/**
 * serial component that check the phone number in the user model
 * found_phone_number is the output
 *
 * @param input number check
 * @param result next action
 * @param next the callback
 */
exports.checkUserPhoneNumber = function (input, result, next) {
    internal_check_process('User', 'cellPhone', 'found_phone_number', input, result, next);
};
/**
 * a part of aysnc module
 * @param input
 * @param result
 * @param next
 */
exports.checkUserEmail = function (input, result, next) {
    internal_check_process('User', 'email', 'found_email_existing', input, result, next);
};
/**
 * a part of aysnc module
 * @param input
 * @param result
 * @param next
 */
exports.checkUserPwd = function (input, result, next) {
    internal_check_process('User', 'password', 'check_pwd', input, result, next);
};

exports.checkToken = function (token) {
    var user = null;
    if (token) {
        try {
            var decoded = jwt.decode(token.token, ks.get('jwtTokenSecret'));
            if (decoded.exp > Date.now() && decoded.iss == token.user._id) {
                user = token.user;
            }
        } catch (err) {

        }
    }
    return user;
};
var internal_check_v2_sim = function (req, callback) {
    var token = req.get(ACCESS_CODE);
    return internal_check(token, callback);
};
var internal_check = function (token_input, callback) {
    const TokenerFinder = Tokenized_model.findOne({token: token_input}).populate("user");
    if (!token_input) {
        return callback(new Error("token input is not defined"));
    }
    TokenerFinder.exec(function (err, token_record) {
        if (err) {
            return callback(err);
        }
        if (_.isNull(token_record)) {
            return callback(new Error("token is not valid"));
        }
        console.log("token check found:\n", token_record);
        //check expiry time
        if (_.isNull(token_record.expire)) {
            return callback(new Error("expiration date is not found"));
        }
        if (token_record.expire > Date.now()) {
            console.log("date.checker", "found data:====================\n");
            console.log(token_record);
            if (token_record.user == null) {
                console.log("date.checker", "token user is not exist with token: " + token_input + " and now we are going to remove the token");
                TokenerFinder.remove(
                    {token: token_input},
                    function (err) {
                        if (_.isError(err)) {
                            console.log('error', err.message);
                            return callback(err);
                        }
                        return callback(new Error("user is not existed and this token was removed"));
                    });
            } else {
                return callback(token_record.user._id);
            }
        } else {
            //this is expired.
            console.log("date.checker", "token is expired :====================\n");
            return callback(new Error("token is expired"));
        }
    });
};
/**
 * as a part of aysnc waterfall function module
 * @param token_input
 * @param callback
 */
exports.check_token = internal_check;

/**
 * check the profile access against the user id and its profile items
 * @param user_id access profile user Id
 * @param profile_id profile Id
 * @param async_next execute
 */
exports.check_profile_access_against_user_id = function (user_id, profile_id, async_next) {
    const Profile = ks.list('Profile');
    //  console.log("profile", "=====================");
    // console.log("check function", async_next);
    console.log("profile", "=====================");
    Profile.model.findOne({_id: profile_id})
        .exec(function (err, profile_object) {
            if (err) {
                console.log("error", err);
                return async_next(new Error("technical error" + err.message));
            }
            if (_.isNull(profile_object)) {
                console.log("profile", "profile is not found.. ");
                return async_next(new Error("profile is not found.."));
            }
            console.log("profile", profile_object);
            if (_.trim(profile_object.access) == _.trim(user_id)) {
                console.log("profile", "=====================");
                console.log("profile", "profile is now found.. ");
                return async_next(null);
            } else {
                console.log("error", profile_object.access);
                console.log("error", "user is not match to this profile.");
                return async_next(new Error("user is not match to this profile."));
            }
        });
};

exports.getBuildPackageChecker_Android = function (req) {
    return {
        current: _.parseInt(req.query['build']),
        officialbuildcode: _.parseInt(ks.get("android_build")),
        officialversionname: ks.get("android_build_version_name"),
        needforupdate: false,
        updateappurl: ''
    };
};

exports.getBuildPackageChecker_IOS = function (req) {
    return {
        current: _.parseInt(req.query['build']),
        officialbuildcode: _.parseInt(ks.get("ios_build")),
        officialversionname: ks.get("ios_build_version_name"),
        needforupdate: false,
        updateappurl: ''
    };
};
