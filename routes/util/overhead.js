/**
 * Created by zJJ on 7/10/2016.
 */

"use strict";
const ks = require('keystone');
var fs = require('fs');
const _ = require('lodash');
const async = require('async');
const checker = require('./checking.js');
const output = require('./outputjson.js');
const requestIp = require('request-ip');
const ipgeo = require("geoip-lite");
const lib_user = require('./user_operation.js');
const ACCESS_CODE = 'access_token';
const Location = ks.list('Location').model;
const Profile = ks.list('Profile').model;
const Pricing = ks.list('Pricing').model;
const Article = ks.list('Article').model;
const Features = ks.list('Feature').model;
const projection_article = {
    "profilesubject": 1, "_id": 1, "rateoverall": 1, "likes": 1
};
const projection_profile = {
    "_id": 1, "english": 1, "likecount": 1, "chinese": 1, "photoprofile": 1
};
const limited_items = 8;
var get_profile_list_based_rating_average_score = function (result_callback, next_Error) {
    var listBig = [];
    Article
        .find()
        .sort("-rateoverall")
        .select(projection_article)
        .populate("profilesubject", projection_profile)
        .limit(limited_items)
        .exec(function (err, result) {
            if (_.isArray(result)) {
                _.forEach(result, function (article) {
                    var mProfile = article.profilesubject;
                    listBig.push(mProfile);
                    console.log("profile_did", "#of article:" + article.rateoverall);
                });
                return result_callback(listBig);
            } else {
                return next_Error(new Error('There is a problem from the search'));
            }
        });
};
var get_simple_profile_list_based_on_like_rate = function (next_callback, next_error) {
    Profile
        .find()
        .sort("-likecount")
        .select(projection_profile)
        .limit(limited_items)
        .exec(function (err, result) {
            if (_.isArray(result)) {
                if (result.length > 0) {
                    console.log('headconfig', 'list on Profile');
                    next_callback(result);
                }
            } else {
                console.log('headconfig', 'error on likecount');
                next_error(new Error('There is a problem from the search'));
            }
        });
};
var get_profile_list_based_comment_counts = function (next_callback, next_error) {

    /*  var newproject = _.extend({
     profile_state: '$profilesubject.state'
     }, projection_article);

     console.log('namec', newproject);*/
    Article.aggregate([
        // {

        /*   $match: {    $and: [{   'profilesubject.state': 'published' }] }    */

        /*   $match: {    profilesubject: {     $elemMatch: {    state: 'published'   }  }  }    */

        // },

        /* 

         {$unwind: '$profilesubject' },    

         */
        /*

         {  $match: {  'profilesubject': 'published'   } },

         */
        {
            $project: _.extend({
                    profile_state: '$profilesubject.state'
                },
                projection_article)
            // $project: newproject
            // $project: projection_article
        }, {
            $group: {
                _id: '$profilesubject',
                // SUCCESS! :D
                total: {$sum: 1}
            }
        }, {
            //adding descending order from the field [total]
            $sort: {
                total: -1
            }
        }
    ]).exec(function (err, result) {
        if (_.isArray(result) && result.length > 0) {
            var listBig = [];
            _.forEach(result, function (article) {
                var mProfile = article._id;
                //     console.log("profile_did", article);
                listBig.push(mProfile);
                //     console.log("profile_did", "#of article:" + article.rateoverall);
            });

            //   console.log('profile_did', listBig);
            if (listBig.length > 0) {
                Profile.find({_id: {$in: listBig}}, projection_profile).exec(function (err, list) {
                    if (err) {
                        next_error(err);
                    } else {
                        //  console.log('profile_did', list);
                        next_callback(list);
                    }
                });
            }
        } else {
            console.log('headconfig', result);
            // next_error(new Error(_.isNull(err.message) ? "no result found" : err.message));
            next_error(new Error("no result found"));
        }
    });
};

var get_location_based_list = function (next_callback, next_error) {
    Location.find().exec(function (err, results) {
        if (_.isArray(results)) {
            console.log('headconfig', 'length:' + results.length);
            console.log('headconfig', '=================');
            var countries_md = [];
            var country_output = [];
            var district_output = [];
            _.forEach(results, function (object) {
                var split = object.map_symbol.split('_');
                var map_call = 'district_' + object.map_symbol;
                var listchoice = ks.get(map_call);
                if (listchoice != null) {
                    district_output.push({
                        country: object.country,
                        countrycode: split[0],
                        choices: listchoice,
                        native: object.native_language,
                        banner: object.banner_front,
                        en: object.english + _.startCase(object.map_symbol)
                    });
                    var level_choice = {
                        country_code: split[0],
                        country_native: object.country,
                        en: object.english
                    };
                    countries_md.push(level_choice);
                }
                country_output = countries_md.unique();
            });
            next_callback(district_output, country_output);
        } else {
            next_error(new Error('There is a problem from the search'));
        }
    });
};

var system_overview_account = function (req, res, done) {
    const data = {
        feature_list: [],
        districts: [],
        countries: [],
        terms_condition: "",
        geo: {},
        user_coin: -1,
        fee: {
            upload_feature_image_fee: _.parseInt(ks.get('upload_feature_image_fee')),
            upload_change_head_image_fee: _.parseInt(ks.get('upload_change_head_image_fee')),
            upload_image_fee_lv1: _.parseInt(ks.get('upload_image_fee_lv1')),
            upload_image_fee_lv2: _.parseInt(ks.get('upload_image_fee_lv2')),
            upload_image_fee_lv3: _.parseInt(ks.get('upload_image_fee_lv3')),
            comment_approval_fee_lv1: _.parseInt(ks.get('comment_approval_fee_lv1')),
            comment_approval_fee_lv2: _.parseInt(ks.get('comment_approval_fee_lv2'))
        },
        top_profile_by_like_counts: [],
        top_profile_by_rose_count: [],
        top_profile_by_comments: [],
        top_profile_by_rated_stars: [],
        top_profile_by_selected: []
    };
    console.log('headconfig', 'start off here');
    async.series(
        [
            function (next) {
                var path = require('path');
                //get the root path of the app
                var __parentDir = path.dirname(module.main);
                //var file = path.resolve(__dirname, '/public/terms.txt');
                var file = __parentDir + '/public/terms.txt';
                fs.readFile(file, 'utf8', function (err, loaded_data) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log(data);
                    data.terms_condition = loaded_data;
                    next();
                });
            },
            function (next) {
                checker.check_token(req.get(ACCESS_CODE), function (user_id) {
                    if (_.isError(user_id)) {
                        next();
                    } else {
                        lib_user.getuser(user_id, function (user) {
                            data.user_coin = user.walletcoins;
                            next();
                        });
                    }
                });
            },
            function (next) {
                var clientIp = requestIp.getClientIp(req);
                console.log('get ip', clientIp);
                data.geo = ipgeo.lookup(clientIp);
                console.log('geo', data.geo);
                console.log("The IP is %s", ipgeo.pretty(clientIp));
                /**
                 * { range: [ 3479299040, 3479299071 ],
                      country: 'US',
                      region: 'CA',
                      city: 'San Francisco',
                      ll: [37.7484, -122.4156] }
                 */
                next();
            },
            function (next) {
                Features.find()
                    .exec(function (err, result) {
                        if (_.isArray(result)) {
                            data.feature_list = result;
                            console.log('headconfig', 'feature list is done');
                            next();
                        } else {
                            return next(new Error('There is a problem from the search'));
                        }
                    });

            },
            function (next) {
                get_profile_list_based_comment_counts(
                    function (list) {
                        data.top_profile_by_comments = list;
                        next();
                    }, function (error) {
                        return next(error);
                    });
            },
            function (next) {
                get_simple_profile_list_based_on_like_rate(
                    function (list) {
                        data.top_profile_by_like_counts = list;
                        next();
                    }, function (error) {
                        return next(error);
                    });
            },
            function (next) {
                get_profile_list_based_rating_average_score(
                    function (list) {
                        data.top_profile_by_rated_stars = list;
                        next();
                    }, function (error) {
                        return next(error);
                    });
            },
            function (next) {
                get_location_based_list(function (districtlist, countrylist) {
                    data.districts = districtlist;
                    data.countries = countrylist;
                    next();
                }, function (error) {
                    return next(error);
                })
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            console.log('profile_ob', 'output line in here');
            return output.outResSuccessWithMessage(data, 'request success', res);
        });
};

Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j]) {
                a.splice(j--, 1);
            } else if (_.isObject(a[i]) && _.isObject(a[j])) {
                var pro = 'country_code';
                if (a[i].hasOwnProperty(pro) && a[j].hasOwnProperty(pro)) {
                    if (a[i][pro] == a[j][pro]) {
                        a.splice(j--, 1);
                    }
                }
            }
        }
    }
    return a;
};

exports.start_api = system_overview_account;