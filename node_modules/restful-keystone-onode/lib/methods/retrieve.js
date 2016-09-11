"use strict";

const debug = require("debug")("restful-keystone");
const errors = require("errors");
const _ = require("lodash");
const utils = require("../utils");
const getId = utils.getId;
const handleResult = utils.handleResult;
const checkObjectId = utils.checkObjectId;
module.exports = function (list,
                           config,
                           entry) {
  config = _.defaults({
    name: list.singular.toLowerCase()
  }, config);
  return {
    handle: function (req,
                      res,
                      next) {
      var id = getId(req);
      var findObj;
      if (checkObjectId(id)) {
        findObj = {
          "_id": id
        };
      } else {
        findObj = {
          "slug": id
        };
      }
      debug("RETRIEVE", config.name, id);
      
      var q = list.model.findById(id, config.retrieveShow, config.options);

      if (config.populateAdv) {
        q.populate(config.populateAdv);
      } else if (config.populate) {
        q.populate(config.populate);
      }


      q.exec()
        .then(function (result) {
          if (!result) {
            throw new errors.Http404Error({
              explanation: "Resource not found with id " + id
            });
          }
          result = handleResult(result, config);
          res.locals.body = result;
          res.locals.status = 200;
          next();
        })
        .then(null, function (err) {
          next(err);
        });
    },
    verb: "get",
    url: entry + "/:id"
  };
};
