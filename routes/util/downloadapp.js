/**
 * Created by zJJ on 6/12/2016.
 */

"use strict";
const async = require('async');
const checker = require('./checking.js');
const output = require('./outputjson.js');
var androidcheck = function (req, res, done) {
    var cache_local = checker.getBuildPackageChecker_Android(req);
    async.series(
        [
            function (next) {
                var uptodate = cache_local.current >= cache_local.officialbuildcode;
                console.log("updatecheck", cache_local, " is up-to-date: " + uptodate);
                cache_local.needforupdate = !uptodate;
                var servers = [
                    process.env.PATH_ANDROID_APP_FARM_1,
                    process.env.PATH_ANDROID_APP_FARM_2,
                    process.env.PATH_ANDROID_APP_FARM_3,
                    process.env.PATH_ANDROID_APP_FARM_4
                ];
                if (!uptodate) {
                    cache_local.updateappurl = servers[Math.floor((Math.random() * servers.length))];
                }
                next();
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            return output.outResSuccessWithMessage(cache_local, 'android package', res);
        });
};
var iphonecheck = function (req, res, done) {
    var cache_local = checker.getBuildPackageChecker_IOS(req);
    async.series(
        [
            function (next) {
                var uptodate = cache_local.current == cache_local.officialbuildcode;
                cache_local.needforupdate = !uptodate;
                if (!uptodate) {
                    cache_local.updateappurl = '';
                }
                next();
            }
        ],
        function (err, result) {
            if (err) {
                return output.outResErro(err.message, res);
            }
            return output.outResSuccessWithMessage(cache_local, 'ios package ipa', res);
        });
};

exports.check_android = androidcheck;
exports.check_ios_iphone = iphonecheck;