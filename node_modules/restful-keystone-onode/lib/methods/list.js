"use strict";
var numeric_page_indicator = false;
const debug = require("debug")("restful-keystone");
const _ = require("lodash");
const deepMerge = require("deepmerge");

//PostSchema.plugin(deepPopulate, options /* more on options below */);
const errors = require("errors");
const retrieve = require("./retrieve");
const utils = require("../utils");
const handleResult = utils.handleResult;
const getId = utils.getId;

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


module.exports = function (list,
                           config,
                           entry) {
  config = _.defaults({
    name: list.path
  }, config);
  return {
    handle: function (req,
                      res,
                      next) {
      debug("LIST", config.name);
      var id = getId(req);
      if (id) {
        return retrieve(list, config, entry).handle(req, res, next);
      }
      var filter = req.query["filter"] || req.body["filter"];
      if (_.isString(filter)) {
        try {
          filter = JSON.parse(filter);
        } catch (err) {
          return next(new errors.Http400Error({
            explanation: "Invalid JSON in query string parameter 'filter'"
          }));
        }
      }

      if (_.isFunction(config.filter)) {
        config.filter = config.filter();
      }
      /*if (_.isBoolean(config.api_page_indicator_use_bool)) {
       
      }*/

      filter = deepMerge(config.filter, filter || {});
      var options = req.query;

      var query = list.model.find(filter);

      // using keystone original query method
      query._original_exec = query.exec;
      query._original_sort = query.sort;
      query._original_select = query.select;

      var currentPage = Number(options.page) || 1;
      var resultsPerPage = Number(options.perPage) || 8;
      var maxPages = Number(options.maxPages) || 10;
      var skip = (currentPage - 1) * resultsPerPage;

      // as of mongoose 3.7.x, we need to defer sorting and field selection
      // until after the count has been executed

      query.select = function () {
        options.select = arguments[0];
        return query;
      };

      query.sort = function () {
        options.sort = arguments[0];
        return query;
      };


      query.exec = function (next) {
        query.count(function (err, count) {
          if (err) {
            return next(err);
          }
          query.find().limit(resultsPerPage).skip(skip);

          if (config.listShow) {
            query.select(config.listShow);
          }

          if (config.populateAdv) {
            query.populate(config.populateAdv);
          } else {
            query.populate(config.populate);
          }

          // apply the select and sort options before calling exec
          if (options.select) {
            query._original_select(options.select);
          }

          if (options.sort) {
            query._original_sort(options.sort);
          }

          query._original_exec(function (err, results) {
            if (err) {
              return next(err);
            }
            var totalPages = Math.ceil(count / resultsPerPage);
            var indicator_previous, indicator_next;

            if (numeric_page_indicator) {
              indicator_previous = (currentPage > 1) ? (currentPage - 1) : -1;
              indicator_next = (currentPage < totalPages) ? (currentPage + 1) : -1;
            } else {
              indicator_previous = currentPage > 1;
              indicator_next = currentPage < totalPages;
            }

            var rtn = {
              total: count,
              currentPage: currentPage,
              totalPages: totalPages,
              pages: [],
              previous: indicator_previous,
              next: indicator_next,
              first: skip + 1,
              last: skip + results.length,
              results: results
            };
            getPages(rtn, maxPages);
            rtn = handleResult(rtn || [], config);
            res.locals.body = rtn;
            res.locals.status = 200;
            next();
          });
        });
      };
      if (next) {
        return query.exec(next);
      } else {
        return query.exec();
      }
    },
    verb: "get",
    url: entry
  };
};
