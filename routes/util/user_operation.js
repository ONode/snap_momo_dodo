/**
 * Created by hesk on 6/4/16.
 */
"use strict";
const bool_registration_require_macaddress = false;
const bool_registration_require_username = true;
const registration_require_password_length = 8;
const registration_default_fake_email_domain = "@520.av";
const free_money = 100;
const ks = require('keystone');
const _ = require('lodash');
const async = require('async');
const Complain = ks.list('Complain');
const ObjectIdAction = ks.mongoose.Types.ObjectId;
const User_model = ks.list(ks.get('user model')).model;
const Token_model = ks.list('Tokenized').model;
const checker = require('./checking.js');
const output = require('./outputjson.js');
const crystal = require('crypto-js');
const moment = require('moment');
const role_name = require('./getRoleName.js');
const restfulutil = require('restful-keystone-onode/lib/utils/');
const TOKEN_DAY_LENGTH = 7;
const ACCESS_CODE = 'access_token';
var user_login_short_token = function (req, res, callback_next) {
    if (!req.body.phone || !req.body.password) {
        return output.outResErro("empty request", res);
    }
    const local_status = {
        user: null,
        token: "",
        expire: "",
        matched_token: false,
        object: 'login',
        coin: -1
    };

    async.series([
            function (next) {
                User_model.findOne({cellPhone: req.body.phone}).exec(function (err, user) {
                    if (err) return next(err);
                    if (user) {
                        ks.callHook(user, 'pre:signinapi', function (err) {
                            console.log('[api.password.check]', 'checking user.' + req.body.phone);
                            if (err) return next(err);
                            console.log('[api.password.check.signinapi]', 'check pass' + req.body.password);
                            user._.password.compare(req.body.password, function (err, isMatch) {
                                if (isMatch) {
                                    local_status.user = user;
                                    next();
                                } else if (err) {
                                    return next(err);
                                } else {
                                    return next(new Error("cannot issue token"));
                                }
                            });
                        });
                    } else {
                        return next(new Error("cannot issue token - user is not defined. "));
                    }
                });
            },
            function (next) {
                var token_check = req.body.token;
                if (_.isNull(token_check)) {
                    next();
                } else {
                    checker.check_token(token_check, function (user_id) {
                        if (_.isError(user_id)) {
                            next();
                        } else {
                            local_status.matched_token = true;
                            local_status.token = token_check;
                            next();
                        }
                    });
                }
            },
            function (next) {
                if (local_status.matched_token) {
                    next();
                } else {
                    var time = new Date();
                    local_status.token = crystal.MD5(local_status.user.email + time.getTime()).toString();
                    local_status.expire = moment().add(TOKEN_DAY_LENGTH, 'days').valueOf();
                    local_status.object = 'login';

                    console.log('[api.password.check] - start process method.');
                    console.log('[api.password.check] - generated new_issued_token:', local_status.token);
                    var issue_token = new Token_model(local_status);
                    console.log('[api.password.check] - token object is formed');
                    issue_token.save(function (err) {
                        if (err) {
                            console.log('[api.password.check] - Error saving new token.', err);
                            console.log('------------------------------------------------------------');
                            return next(new Error('Sorry, there was an error processing your account, please try again.'));
                        }
                        console.log('[api.password.check] - Saved new token.');
                        console.log('------------------------------------------------------------');
                        //return output.outResSuccess(local_object, res);
                        next();
                    });
                }
            },
            function (next) {
                local_status.user_profile_id = null;
                local_status.roles = local_status.user.roles;
                local_status.email = local_status.user.email;
                local_status.phone = local_status.user.cellPhone;
                local_status.color = local_status.user.customization;
                local_status.coin = local_status.user.walletcoins;
                local_status.userid = local_status.user._id;
                local_status.explore_performer_profile_id = false;
                if (_.contains(local_status.roles, "performer")) {
                    console.log('[api.account.exploremore] - it is an performer');
                    local_status.explore_performer_profile_id = true;
                }
                console.log('[api.account.jsonoutput] - remove user object');
                delete local_status.user;
                next();
                //remove the expired tokens
                /*  let tokenprocess = new Token.model.find({user: local_status.user});
                 tokenprocess.exec(function (err, docs) {
                 _.forEach(docs, function (doc) {
                 console.log('[api.tokens.remove] - token token. ' + doc.token);
                 console.log('[api.tokens.remove] - token expire. ' + doc.expire);
                 })
                 });

                 */
            },
            function (next) {
                if (local_status.explore_performer_profile_id) {
                    var profile_pop = ks.list("Profile").model;
                    profile_pop.find({
                        access: _.trim(local_status.userid)
                    }).exec(function (err, result) {
                        if (_.isArray(result) && result.length === 0) {
                            console.log('[api.account.performer] - profile not found');
                            next();
                        } else {
                            console.log('[api.account.performer] - profile found and save the profile id');
                            local_status.user_profile_id = _.trim(result[0]._id);
                            next();
                        }
                    });
                } else {
                    next();
                }
            }
        ],
        function (error, result) {
            //    local_status.userid;
            delete local_status.matched_token;
            delete local_status.explore_performer_profile_id;
            if (error) {
                var message_err = error.message;
                console.log(message_err);
                return output.outResErro(message_err, res);
            } else {
                return output.outResSuccess(local_status, res);
            }
        });
};


var create_basic_user = function (req, res, next) {

    const local_status = {
        db_not_found: false,
        response_message: "",
        action_success: false,
        secret_key: "",
        account_email: "",
        token: "",
        phone_number: "",
        baseid: "",
        temp: {}
    };


    if (!req.body) {
        console.log('[auth.confirm] - No auth data detected, redirecting to signin.');
        console.log('------------------------------------------------------------');
        return res.json(output.resError('no data found'));
    } else {
        var _b = req.body;
        var _phone = _b["phone_number"];
        var _recovery_email = _b["email"];
        var _name = _b["username"];
        var _macid = _.trim(_b["macid"]);
        var _type = _b["usertype"];

        if (!_name && bool_registration_require_username) {
            var m = "Please enter user name";
            console.log('[registration.notification]', m);
            return output.outResErro(m, res);
        }

        if (!_macid && bool_registration_require_macaddress) {
            var m = "mac address is not found";
            console.log('[registration.notification]', m);
            return output.outResErro(m, res);
        }

        if (_.toString(_phone).length < registration_require_password_length) {
            var m = "Phone number needs to be at least " + registration_require_password_length + ".";
            console.log('[registration.notification]', m);
            return output.outResErro(m, res);
        }

        if (_recovery_email == "" || !_recovery_email) {
            local_status.account_email = _phone + registration_default_fake_email_domain;
        } else {
            local_status.account_email = _recovery_email;
        }

        async.series([
                function (cb) {
                    checker.checkUserPhoneNumber(_phone, local_status, cb);
                },
                function (cb) {
                    if (local_status.db_not_found) {
                        local_status.temp.user = {
                            password: crystal.MD5(_phone).toString(),
                            email: local_status.account_email,
                            'name.full': _name,
                            macId: _macid,
                            cellPhone: _phone,
                            walletcoins: ks.get('default_coins')
                        };
                        local_status.secret_key = local_status.temp.user.password;
                        var init_user = new User_model(local_status.temp.user);
                        init_user.save(function (err) {
                            if (err) {
                                local_status.response_message = err.message;
                                console.log("CREATED:", "new item", err);
                                return cb(new Error(local_status.response_message));
                            }
                            local_status.action_success = true;
                            local_status.response_message = "new user is created";
                            local_status.phone_number = _phone;
                            local_status.temp.user = init_user;
                            cb(null, true);
                        });
                    } else {
                        local_status.action_success = false;
                        local_status.response_message = "cannot create new user because the phone number is exist.";
                        console.log("NOT NEED TO INSERT:", "NO DATA TO INSERT - phone number is already in the db");
                        return cb(new Error(local_status.response_message));
                    }
                },
                function (cb) {
                    local_status.action_success = true;
                    var time = new Date();
                    console.log('[api.password.check]', 'Continue with the user object.', local_status.temp.user);
                    var local_object = {
                        token: crystal.MD5(local_status.temp.user.email + time.getTime()).toString(),
                        user: local_status.temp.user._id,
                        expire: moment().add(TOKEN_DAY_LENGTH, 'days').valueOf(),
                        object: 'login'
                    };
                    local_status.baseid = local_object.user;
                    local_status.token = local_object.token;
                    var issue_token = new Token_model(local_object);
                    issue_token.save(function (err) {
                        if (err) {
                            console.log('[api.password.check]', 'Error saving new token.', err);
                            console.log('------------------------------------------------------------');
                            local_status.response_message = 'Sorry, there was an error processing your account, please try again.', res
                            return cb(new Error(local_status.response_message));
                        }
                        console.log('[api.password.check]', 'Saved new token.');
                        console.log('------------------------------------------------------------');
                        cb(null, true);
                    });
                }
            ], function (error, result) {
                if (error) {
                    var message_err = error.message;
                    console.log(message_err);
                    return output.outResErro(message_err, res);
                } else {
                    delete local_status.db_not_found;
                    if (!local_status.action_success) {
                        delete local_status.secret_key;
                        delete local_status.account_email;
                        return output.outResErro(local_status.response_message, res);
                    }
                    delete local_status.action_success;
                    //  delete local_status.temp;
                    return output.outResSuccess(local_status, res);
                }
            }
        );
    }
};
/**
 * input token -> user id will need to match up with the user id
 * @param req
 * @param res
 * @param next
 */
var update_user_basic = function (req, res, next) {
    var _b = req.body;

    const exclude_fields = ['password', 'isVerified', 'isAdmin', 'notifications.posts', 'notifications.meetups', 'roles', 'cellPhone'];
    _.forEach(exclude_fields, function (e) {
        if (_b[e]) {
            delete _b[e];
        }
    });
    checker.check_token(req.get(ACCESS_CODE), function (user_id) {
        if (_.isError(user_id)) {
            return output.outResErro(user_id.message, res);
        } else {
            //user
            if (restfulutil.getId(req) == user_id) {
                next();
            } else {
                console.log({
                    request_id: restfulutil.getId(req),
                    user_id_by_token: user_id
                });
                return output.outResErro("user token does not match", res);
            }
        }
    });
};
var update_basic_normal_special_user = function (req, res, next) {
    var cache_local = {
        role_name: '',
        usr_id: ''
    };
    async.series(
        [
            function (next) {
                checker.check_token(req.get(ACCESS_CODE), function (user_id) {
                    cache_local.usr_id = _.trim(user_id);
                    next();
                });
            },
            function (next) {
                cache_local.role_name = role_name(req);
                next();
            },
            function (next) {
                User_model.update(
                    {_id: cache_local.usr_id},
                    {
                        $set: {
                            roles: cache_local.role_name,
                            walletcoins: free_money
                        }
                    },
                    {upsert: true, safe: true},
                    function (err, doc_affected) {
                        if (err) {
                            console.log(err);
                            return next(new Error("error is here " + err.message));
                        }
                        next();
                    }
                );

                /**
                 *

                 User_model.update(
                 {_id: cache_local.usr_id},
                 {$addToSet: {roles: cache_local.role_name}},
                 {upsert: true},
                 function (err, doc_affected) {
                        if (err) {
                            console.log(err);
                            return next(new Error("error is here " + err.message));
                        }
                        next();
                    }
                 );*/
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            console.log('user update', '=========================================');
            console.log('user update', '======= update role is successful =======');
            console.log('user update', '=========================================');
            return output.outResSuccessWithMessage(cache_local, 'request success', res);
        });
};
/**
 * assume user is using the existing profile with the giving user id
 * getid will be the profile current id.
 * to make sure this user has the right change this profile data.
 *
 * @param req request
 * @param res response
 * @param next next function reactions
 */
var update_profile_basic = function (req, res, next) {
    ks.list('Profile').model.findOne({
        _id: restfulutil.getId(req)
    }).exec(function (err, profile) {
        if (err) {
            return output.outResErro(err.message, res);
        }
        if (!profile.access) {
            return output.outResErro("this profile does not belongs to you", res);
        }
        checker.check_token(req.get(ACCESS_CODE), function (user_id) {
            if (_.isError(user_id)) {
                return output.outResErro(user_id.message, res);
            } else {
                console.log({
                    profile_access_user_id: profile.access,
                    user_id_by_token: user_id
                });
                var profile_match_user_id = _.trim(profile.access) == _.trim(user_id);
                console.log("is match:===", profile_match_user_id);
                if (profile_match_user_id) {
                    console.log("call native update progress");
                    next();
                } else {
                    return output.outResErro("user token does not match to this profile", res);
                }
            }
        });
    });
};
var update_profile_after = function (req, res, next) {
    next();
};
/**
 * this must be used by the performer thus it will assign the user to be the performer
 * after the first profile has been created.
 * @param req express input
 * @param res express input
 * @param next express input
 */
var create_profile_after = function (req, res, next) {
    var new_profile = res.locals.body.profile;
    var user_id_ret = req.params.user_id;
    var profile_pop = ks.list("Profile").model;
    console.log("profile:", "new profile is created ", new_profile._id);
    console.log("user:", "the user id detected ", user_id_ret);
    console.log("profile:", "now - ", new_profile);
    var cache_local = {
        profile_id: new_profile._id,
        profile_doc: null,
        user_id: req.params.user_id,
        role: "performer"
    };

    async.series([
        function (next) {
            profile_pop.findByIdAndUpdate(
                cache_local.profile_id,
                {
                    $set: {
                        "access": ObjectIdAction(user_id_ret),
                        "bodycheck": "",
                        "likecount": 0
                    }
                },
                {safe: true, upsert: true},
                function (err, doc) {
                    if (err) {
                        console.log(err);
                        return next(new Error("error is here " + err.message));
                    }
                    cache_local.profile_doc = doc;
                    next();
                });
        },
        function (next) {
            User_model.update(
                {_id: cache_local.user_id},
                {$addToSet: {roles: 'performer'}},
                {upsert: true},
                function (err, doc_affected) {
                    if (err) {
                        console.log(err);
                        return next(new Error("error is here " + err.message));
                    }
                    next();
                }
            );
        }
    ], function (err, result) {
        if (err) {
            return output.outResErro(err.message, res);
        }
        return output.outResSuccessWithMessage(cache_local, "successfully creating a new profile", res);
    });
};
var get_user_by_id = function (user_id, next) {
    User_model.findOne({_id: _.trim(user_id)}).exec(function (err, user) {
        if (err) return next(err);
        return next(user);
    });
};
/**
 * to check for double entries
 * @param req from the http request
 * @param user_id the user id
 * @param next the callback
 */
var check_profile_phone_with_access_id = function (req, res, user_id, next) {
    var profile_pop = ks.list("Profile").model;
    var _number = req.body.number;
    profile_pop.find({
        // _id: _.trim(profile_id),
        number: _number,
        access: _.trim(user_id)
    }).exec(function (err, result) {
        if (_.isArray(result) && result.length === 0) {
            next();
        } else {
            //console.log("found items", result);
            return output.outResErro("found existing phone number, no need to create a new one.", res);
        }
    });
};
/**
 * before creating the profile
 * @param req request from the http
 * @param res the response from the mechanism
 * @param next the next step
 */
var create_profile_before = function (req, res, next) {
    checker.check_token(req.get(ACCESS_CODE), function (user_id) {
        if (_.isError(user_id) || _.isUndefined(user_id)) {
            if (_.isError(user_id)) {
                return output.outResErro(user_id.message, res);
            }
            if (_.isUndefined(user_id)) {
                return output.outResErro("error no user id is found", res);
            }
        } else {
            req.params.user_id = user_id;
            console.log("profile:", "start creating profile object id:", user_id);
            check_profile_phone_with_access_id(req, res, user_id, next);
        }
    });
};
/**
 * this garbage collector is to recycle the expired and unused tokens that no longer valid
 */
var gc_tokenizer = function (req, res, next) {
    var cache_local = {
        found: 0,
        removedCalls: []
    };
    const TokenerFinder = Token_model
            .find({
                expire: {$lt: Date.now()}
                //  user: {$exists: false}
                //user: {$exists: false}
                // token: "1ae71ae7b8623b5635cd516964495251"
            })
            .populate("user")
        ;

    async.series([
            function (next) {
                TokenerFinder.exec(function (err, token_records) {
                    if (err) {
                        return next(err);
                    }
                    cache_local.found = token_records.length;
                    if (token_records.length > 0) {
                        _.forEach(token_records, function (record) {
                            if (record.user == null) {
                                var varid = _.trim(record.token);
                                console.log('token', varid);
                                cache_local.removedCalls.push(varid);
                            }
                        });
                    }
                    //  token_records.pullAll();
                    next();
                });
            },
            function (next) {
                if (cache_local.found > 0) {
                    TokenerFinder.remove(
                        {token: {$in: cache_local.removedCalls}},
                        function (err) {
                            if (_.isError(err)) {
                                console.log('error', err.message);
                                return next(err);
                            } else {
                                next();
                            }
                        });
                } else {
                    next();
                }
                /*  if (cache_local.found > 0) {
                 console.log('remove start now');
                 async.parallel(cache_local.removedCalls, function (err, result) {
                 /!* this code will run after all calls finished the job or
                 when any of the calls passes an error *!/
                 if (err) return next(err);
                 console.log('remove done' + result);
                 next();
                 });
                 } else {
                 next();
                 }*/
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            delete cache_local.removedCalls;
            return output.outResSuccessWithMessage(cache_local, "successfully creating a new profile", res);
        });
};
exports.create_profile = create_profile_before;
exports.create_profile_after = create_profile_after;
exports.create_user_basic = create_basic_user;
exports.user_login_short_token = user_login_short_token;
exports.update_user_basic = update_user_basic;
exports.update_profile_basic = update_profile_basic;
exports.update_profile_after = update_profile_after;
exports.update_basic_normal_special_user = update_basic_normal_special_user;
exports.getuser = get_user_by_id;
exports.clean_up_tokens = gc_tokenizer;

    