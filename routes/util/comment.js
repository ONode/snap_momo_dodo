/**
 * Created by zJJ on 6/10/2016.
 */
"use strict";
const ks = require('keystone');
const _ = require('lodash');
const async = require('async');
const Complain = ks.list('Complain');
const ObjectIdAction = ks.mongoose.Types.ObjectId;
const User = ks.list(ks.get('user model'));
const Token = ks.list('Tokenized');
const checker = require('./checking.js');
const output = require('./outputjson.js');
const crystal = require('crypto-js');
const moment = require('moment');
const role_name = require('./getRoleName.js');
const coinsys = require('./creditsystem.js');
const restfulutil = require('restful-keystone-onode/lib/utils/');
const TOKEN_DAY_LENGTH = 7;
const commentModel = ks.list("Article").model;
const ACCESS_CODE = 'access_token';
const c_before = function (req, res, next) {
    console.log('[api.comment.post]', req.body);
    console.log('[api.comment.post]', res);
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
            console.log("user:", "start checking the role of this user:", user_id);
            //check_profile_phone_with_access_id(req, res, user_id, next);
            User.model.findOne({_id: user_id}).exec(function (err, profile_object) {
                console.log("user:", "user role check:", profile_object);
                if (!_.isNull(profile_object)) {
                    if (_.contains(profile_object.roles, "traveler") || _.isEqual(profile_object.roles, "traveler")) {
                        next();
                    } else {
                        return output.outResErro("role is not comment", res);
                    }
                } else {
                    return output.outResErro("there is no such user", res);
                }
            });
        }
    });
};
const comment_like_count = function (profileId, next) {
    commentModel.findByAndUpdate(
        profileId,
        {$inc: {'likes': 1}},
        {safe: true, upsert: false},
        function (err, model) {
            if (err) {
                console.log(err);
                return next(new Error('error is here ' + err.message));
            }
            next();
        });
};
const getperformerid = function (req) {
    return req.params["profile_target_id"] || req.query["profile_target_id"] || ( req.body && req.body["profile_target_id"] );
};
const c_after = function (req, res, next) {
    var new_created_article = res.locals.body.article;
    var performer_id = getperformerid(req);
    var writer_id = req.params.user_id;
    console.log("comment:", "new profile is created ", new_created_article._id);
    console.log("performer:", "the user id detected ", performer_id);
    console.log("comment:", "now - ", new_created_article);
    var cache_local = {
        title: "comment from " + writer_id,
        comment_id: new_created_article._id,
        author: writer_id,
        profile_id: performer_id,
        role: "performer"
    };
    async.series([
        function (next) {
            commentModel.findByIdAndUpdate(
                cache_local.comment_id,
                {
                    $set: {
                        "profilesubject": ObjectIdAction(performer_id),
                        "author": ObjectIdAction(writer_id),
                        "likes": 0,
                        "status": "pending"
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
        }
    ], function (err, result) {
        if (err) {
            return output.outResErro(err.message, res);
        }
        return output.outResSuccessWithMessage(cache_local, "successfully creating a new comment report", res);
    });
};
const proposelike = function (req, res, done) {
    var cache_local = {
        profile_id: '',
        totalcount: -1
    };
    async.series(
        [
            function (next) {
                cache_local.profile_id = getProfileId(req);
                if (cache_local.profile_id == null) return next(new Error('profile id is not defined.'));
                next();
            },
            function (next) {
                comment_like_count(cache_local.profile_id, next);
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            return output.outResSuccessWithMessage(cache_local, 'positive update', res);
        });
};

const check_and_approve_comment = function (comment_id, next) {
    const process = {credit: null, remain: 0};
    const content = {
        exec: function () {
            async.series(
                [
                    function (next) {
                        commentModel.findOne({_id: comment_id}).populate('profilesubject').exec(
                            function (err, doc) {
                                if (_.isError(err)) {
                                    return next(err);
                                }
                                var user_access = _.trim(doc.profilesubject.access);
                                var fee = _.parseInt(ks.get('comment_approval_fee_lv1'));
                                console.log('girl_user_account: ', user_access);
                                process.credit = coinsys.useCredit(fee, user_access, next, 'approve comment level 1');
                                process.credit.exe();
                            });
                    },
                    function (next) {
                        process.remain = process.credit.remain;
                        commentModel.findByIdAndUpdate(
                            comment_id,
                            {
                                $set: {
                                    "likes": 10,
                                    "status": "published"
                                }
                            },
                            {safe: true, upsert: true},
                            function (err, doc) {
                                if (_.isError(err)) {
                                    return next(err);
                                }
                                content.detail = doc;
                                next();
                            }
                        );
                    }
                ],
                function (err, result) {
                    if (err) {
                        content.result = false;
                        content.message = err.message;
                        // return output.outResErro(err.message, res);
                    }
                    content.result = true;
                    //  return output.outResSuccessWithMessage(cache_local, 'positive update', res);
                }
            );
        },
        message: "",
        detail: {},
        result: false
    };

    return content;
};
exports.approve_comment = check_and_approve_comment;
exports.create_article_comment_after = c_after;
exports.create_article_comment_before = c_before;
exports.likecounthit = proposelike;