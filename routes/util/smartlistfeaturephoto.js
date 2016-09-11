/**
 * Created by zJJ on 6/18/2016.
 */
const ks = require('keystone');
const _ = require('lodash');
//const output = require('./outputjson.js');
const handleResult = require('restful-keystone-onode/lib/utils/handleResult');
//const deepmerged = require('deepmerge');
function getPages(options, maxPages) {
    var surround = Math.floor(maxPages / 2);
    var firstPage = maxPages ? Math.max(1, options.currentPage - surround) : 1;
    var padRight = Math.max(((options.currentPage - surround) - 1) * -1, 0);
    var lastPage = maxPages ? Math.min(options.totalPages, options.currentPage + surround + padRight) : options.totalPages;
    var padLeft = Math.max(((options.currentPage + surround) - lastPage), 0);
    options.pages = [];
    firstPage = Math.max(Math.min(firstPage, firstPage - padLeft), 1);
    for (var i = firstPage; i <= lastPage; i++) {
        options.pages.push(i);
    }
    if (firstPage !== 1) {
        options.pages.shift();
        options.pages.unshift('...');
        options.pages.unshift(1);
    }
    if (lastPage !== Number(options.totalPages)) {
        options.pages.pop();
        options.pages.push('...');
        options.pages.push(options.totalPages);
    }
}
/**
 * reassign variables to the array
 * @param list
 * @returns {*}
 */
var flattenResult = function (list) {
    "use strict";
    var h = [];
    var p = [];
    if (_.isArray(list)) {
        _.forEach(list, function (y) {
            _.forEach(y.photofeature, function (j) {
                p.push(y);
                h.push(j);
            });
        });
    }
    return _.zipWith(h, p, function (h1, p1) {
        var dead = JSON.stringify(h1);
        var image_object = JSON.parse(dead);
        image_object.jprofile = p1._id;
        image_object.nickname = p1.chinese;
        image_object.nickname_en = p1.english;
        image_object.likes = p1.likecount;
        console.log("check", image_object);
        return image_object;
    });
};
var custom_pagination = function (req, res, next) {
    // console.log('images', req);
    var options = req.query;
    var currentPage = Number(options.page) || 1;
    var resultsPerPage = Number(options.perPage) || 8;
    var maxPages = Number(options.maxPages) || 10;
    var skipping = (currentPage - 1) * resultsPerPage;

    var profile_pop = ks.list("Profile").model;
    var projection = {"photofeature": 1, "_id": 1,  "english": 1,  "likecount": 1,  "chinese": 1};
    var query_statement = {"photofeature": {$exists: true, $gt: {$size: 0}}};
    var query_handle_obj = profile_pop.find(query_statement, projection);
    // using keystone original query method
    query_handle_obj._original_exec = query_handle_obj.exec;
    query_handle_obj._original_sort = query_handle_obj.sort;
    query_handle_obj._original_select = query_handle_obj.select;

    query_handle_obj.exec = function (next) {
        query_handle_obj.count(function (err, count) {
            if (err) {
                return next(err);
            }
            query_handle_obj.find().limit(resultsPerPage).skip(skipping);
            query_handle_obj._original_exec(function (err, _results) {
                if (err) {
                    return next(err);
                }
                var totalPages = Math.ceil(count / resultsPerPage);
                var indicator_previous, indicator_next;


                indicator_previous = currentPage > 1;
                indicator_next = currentPage < totalPages;

                var rtn = {
                    total: count,
                    currentPage: currentPage,
                    totalPages: totalPages,
                    pages: [],
                    previous: indicator_previous,
                    next: indicator_next,
                    first: skipping + 1,
                    last: skipping + _results.length,
                    results: flattenResult(_results)
                };

                getPages(rtn, maxPages);
                var config = {};
                config.envelop = false;

                rtn = handleResult(rtn || [], config);
                res.locals.body = rtn;
                res.locals.status = 200;
                //  next();
                return res.status(res.locals.status).json(res.locals.body);
            });
        });
    };
    query_handle_obj.exec();
};
exports.list_feature_images = custom_pagination;