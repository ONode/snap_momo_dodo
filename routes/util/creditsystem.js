const ks = require('keystone');
const User_model = ks.list('User').model;
const CoinSys_model = ks.list('Coin').model;
const _ = require('lodash');
const TOKEN_DAY_LENGTH = 360;
const moment = require('moment');
const crystal = require('crypto-js');
const async = require('async');
const ObjectIdAction = ks.mongoose.Types.ObjectId;
const output = require('./outputjson.js');
const getProfileId = require('./getProfileId.js');
const check = require('./checking.js');
var logevent = function (userid, amount, eventnote, creditdebit) {
    "use strict";
    console.log('credit system', {
        uid: userid,
        coin: amount,
        note: eventnote,
        action: creditdebit
    });
};
var display_printable_code = function (mcode) {
    var printable_code = "C:" + mcode;
    var url = "https://zxing.org/w/chart?cht=qr&chs=350x350&chld=H&choe=UTF-8&chl=";
    return {
        code: mcode,
        image: url + printable_code
    }
};
var coin_model_redeem_issue_coins = function (amount, coin, next) {
    var time = new Date();

    var loc = {
        current: 0,
        operation: function () {
            "use strict";
            if (loc.current < amount) {
                var p = time.getTime().valueOf() + loc.current * 100;
                console.log('[api.issue.checks]', p);
                var keytoken = crystal.MD5(p + 'ct-hk').toString();
                console.log('[api.issue.checks]', keytoken);
                var locobject = {
                    token: keytoken,
                    expire: moment().add(TOKEN_DAY_LENGTH, 'days').valueOf(),
                    amount: coin
                };
                loc.tokens.push(display_printable_code(keytoken));
                var issue_token = new CoinSys_model(locobject);
                issue_token.save(function (err) {
                    if (err) {
                        console.log('------------------------------------------------------------');
                        console.log('[api.issue.checks]', 'Error saving new token.', err);
                        console.log('------------------------------------------------------------');
                        return next(err);
                    }
                    console.log('--------------------------------------------------------------');
                    console.log('[api.issue.checks]', 'count @ ' + loc.current + '.');
                    console.log('--------------------------------------------------------------');
                    loc.current = loc.current + 1;
                    loc.operation();
                });
            } else {
                console.log('--------------------------------------------------------------');
                console.log('[api.issue.checks]', 'Successful issued ' + coin + ' for this ticket.');
                console.log('--------------------------------------------------------------');
                next();
            }
        },
        tokens: []
    };
    loc.operation();
    return loc;
};
var issue_redeem_action = function (user_id, token_code, next) {
    var time = new Date();
    const von = {
        user_account: user_id,
        update_command: {
            $set: {
                "user": ObjectIdAction(user_id),
                "redeem": moment(),
                "check_validation": true,
                "has_redeem": true
            }
        },
        process_operation: function () {
            CoinSys_model.findOne({token: token_code}).exec(function (err, doc) {
                if (_.isError(err)) {
                    return next(err);
                }
                if (doc == null) {
                    return next(new Error("not a valid ticket"));
                }
                if (doc.expire < Date.now()) {
                    return next(new Error("token is expired and it cannot be used"));
                }
                if (doc.user != null) {
                    return next(new Error("ticket has been redeemed."));
                }
                if (_.isBoolean(doc.check_validation) && !doc.check_validation) {
                    return next(new Error("this ticket is not validated."));
                }
                if (_.isBoolean(doc.has_redeem) && !doc.has_redeem) {
                    CoinSys_model.findByIdAndUpdate(
                        doc._id,
                        von.update_command,
                        {safe: true, upsert: true},
                        function (err, model) {
                            if (err) {
                                console.log(err);
                                return next(new Error("error is here " + err.message));
                            }
                            if (_.parseInt(model.amount) > 0) {
                                //redeem account action continue
                                next();
                            } else {
                                return next(new Error("there is no amount to be adding."));
                            }
                        });
                }
            });
        }
    };
    von.process_operation();
    return von;
};
var credit_account = function (amount, userid, next, event_name) {
    "use strict";
    const creditobject = {
        process_operation: function () {
            return User_model.findOne({_id: userid}).exec(function (err, doc) {
                if (_.isError(err)) return next(err);
                var available = _.parseInt(doc.walletcoins);
                var add = _.parseInt(amount);
                creditobject.creditamount = add;
                var remain_coin = available + add;
                User_model.findByIdAndUpdate(
                    userid,
                    {$set: {'walletcoins': remain_coin}},
                    {safe: true, upsert: false},
                    function (err, model) {
                        if (_.isError(err)) return next(err);
                        creditobject.remain = remain_coin;
                        logevent(userid, amount, event_name, 'credit');
                        next();
                    });
            });
        },
        creditamount: 0,
        remain: 0
    };
    creditobject.process_operation();
    return creditobject;
};
var take_credit = function (amount, userid, next, event_name) {
    const creditobject = {
        exe: function () {
            return User_model.findOne({_id: userid}).exec(function (err, doc) {
                if (_.isError(err)) return next(err);
                var available = _.parseInt(doc.walletcoins);
                var use = _.parseInt(amount);
                var remain_coin = available - use;
                if (use > available) {
                    return next(new Error("not enough to pay"));
                } else {
                    User_model.findByIdAndUpdate(
                        userid,
                        {$set: {'walletcoins': remain_coin}},
                        {safe: true, upsert: false},
                        function (err, model) {
                            if (_.isError(err)) return next(err);
                            creditobject.remain = remain_coin;
                            logevent(userid, amount, event_name, 'debit');
                            next();
                        });
                }
            });
        },
        remain: 0
    };
    return creditobject;
};

const get_coin_by_user = function (userid, callback) {
    User_model.findOne({_id: userid}).exec(function (err, doc) {
        if (_.isError(err)) {
            callback(_.parseInt(-1));
        } else {
            callback(_.parseInt(doc.walletcoins));
        }
    });
};
const action_redeem_request = function (req, res, next_call) {
    var C = {
        user_id: null,
        code: null,
        amount: 0,
        remain: 0,
        creditsystem: null,
        checksystem: null
    };
    async.series(
        [
            function (next) {
                C.user_id = req.params["user_id"];
                C.code = req.params["code"];
                if (C.user_id == null) {
                    return next(new Error("no userid"));
                }
                if (C.user_id == null) {
                    return next(new Error("no code"));
                }
                C.checksystem = issue_redeem_action(C.user_id, C.code, next);
            },
            function (next) {
                C.creditsystem = credit_account(100, C.user_id, next, 'add coin amount');
            },
            function (next) {
                C.amount = C.creditsystem.creditamount;
                C.remain = C.creditsystem.remain;
                next();
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            delete C.creditsystem;
            delete C.checksystem;
            return output.outResSuccessWithMessage(C, 'redeem coins', res);
        });
};
const action_issue_tickets = function (req, res, next_call) {
    var C = {
        coin: 0,
        amount: 0,
        tokens: [],
        CoinSys_model: null
    };
    async.series(
        [
            function (next) {
                C.coin = req.query["coin"];
                C.amount = req.query["amount"];
                if (C.coin == null) {
                    return next(new Error("request coin"));
                }
                if (C.amount == null) {
                    return next(new Error("request amount"));
                }
                C.CoinSys_model = coin_model_redeem_issue_coins(C.amount, C.coin, next);
            },
            function (next) {
                C.tokens = C.CoinSys_model.tokens;
                next();
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            delete C.CoinSys_model;
            return output.outResSuccessWithMessage(C, 'issued coins', res);
        });
};
const action_list_all_coins = function (req, res, next_call) {
    var C = {
        tokens: []
    };
    async.series(
        [
            function (next) {
                console.log("check", "lv1");
                CoinSys_model
                    .find({'has_redeem': false})
                    .exec(function (err, results) {
                        console.log("check", "lv2");
                        if (_.isError(err)) {
                            return next(err);
                        }
                        console.log("check", "lv3");
                        if (results == null) {
                            return next(new Error("no data"));
                        }
                        console.log("check", "lv4");
                        if (_.isArray(results)) {
                            console.log("check", "lv5");
                            _.forEach(results, function (x) {
                                C.tokens.push(display_printable_code(x.token));
                            });
                        }
                        next();
                    });
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            return output.outResSuccessWithMessage(C, 'check unused coin success', res);
        }
    );
};
/**
 * setting up the rose system
 */
var prepare_rose_system = function (req, res, new_config) {
    const ACCESS_CODE = 'access_token';
    var config = _.extend(new_config, {
        getprofileid: false,
        buyrose: false,
        giverosetouser: false,
        giverosetoprofile: false,
        buyroselevel: 0,
        amount: 0
    });
    var C = {
        coin: 0,
        amount: 0,
        rosecost: 0,
        roseamount: 0,
        uid: null,
        pid: null,
        rose_system_exe: function () {
            async.series(
                [
                    function (next) {
                        check.check_token(req.get(ACCESS_CODE), function (user_id) {
                            if (_.isError(user_id)) {
                                return next(user_id);
                            } else {
                                C.uid = _.trim(user_id);
                                next();
                            }
                        });
                    },
                    function (next) {
                        var UserModel = User_model.findOne({_id: C.uid});
                        UserModel.exec(function (err, doc) {
                            if (_.isError(err)) {
                                return next(err);
                            } else {
                                C.amount = doc.walletcoins;
                                C.rose = doc.rose;
                                next();
                            }
                        });
                    },
                    function (next) {
                        if (config.getprofileid) {
                            C.pid = getProfileId(req);
                        }
                        next();
                    },
                    function (next) {
                        if (config.buyrose && config.buyroselevel > 0) {
                            if (config.buyroselevel == 1) {
                                C.rosecost = _.parseInt(ks.get('rose_small_bundle'));
                                C.roseamount = _.parseInt(ks.get('rose_small_bundle_amount'));
                            } else if (config.buyroselevel == 2) {
                                C.rosecost = _.parseInt(ks.get('rose_big_bundle'));
                                C.roseamount = _.parseInt(ks.get('rose_big_bundle_amount'));
                            } else if (config.buyroselevel == 3) {
                                C.rosecost = _.parseInt(ks.get('rose_super_bundle'));
                                C.roseamount = _.parseInt(ks.get('rose_super_bundle_amount'));
                            } else {
                                return next(new Error("rose buy level not correct"));
                            }

                            if (C.amount < C.rosecost) {
                                return next(new Error("not enough coin"));
                            }
                            logevent(C.uid, C.rosecost, "acquired " + C.roseamount + " rose", "debit");
                            User_model.findByAndUpdate(
                                C.uid,
                                {
                                    $inc: {
                                        'rose': C.roseamount,
                                        'walletcoins': -C.rosecost
                                    }
                                },
                                {safe: true, upsert: true},
                                function (err, model) {
                                    if (err) {
                                        return next(err);
                                    }
                                    next();
                                }
                            );
                        } else {
                            next();
                        }
                    }
                ],
                function (err, result) {
                    if (err) {
                        return output.outResErro(err.message, res);
                    }
                    delete C.rose_system_exe;
                    return output.outResSuccessWithMessage(C, 'issued coins', res);
                });
        }
    };
    return C;
};
var action_buy_rose = function (req, res, next) {
    var action = prepare_rose_system(req, res,
        {
            buyrose: true,
            buyroselevel: _.parseInt(req.query["lv"])
        }
    );
    action.rose_system_exe();
};
var action_give_rose_user = function (req, res, next) {
    var action = prepare_rose_system(req, res,
        {
            giverosetouser: true,
            amount: _.parseInt(req.query["amount"])
        }
    );
    action.rose_system_exe();
};
var action_give_rose_profile = function (req, res, next) {
    var action = prepare_rose_system(req, res,
        {
            giverosetoprofile: true,
            amount: _.parseInt(req.query["amount"])
        }
    );
    action.rose_system_exe();
};
exports.getCoinBalance = get_coin_by_user;
exports.useCredit = take_credit;
exports.addCoin = credit_account;
exports.req_issue_coins = action_issue_tickets;
exports.req_redeem_issue = action_redeem_request;
exports.req_list_all_available_tokens = action_list_all_coins;
exports.req_buy_rose = action_buy_rose;
exports.req_give_rose_to_user = action_give_rose_user;
exports.req_give_rose_to_profile = action_give_rose_profile;