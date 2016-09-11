"use strict";
const _ = require("lodash");
const constants = require("../constants");
const parseMixedValue = require("./parseMixedValue");

module.exports = function parseListConfig(list,
                                          config) {
  if (config && !config.hidden) {
    config = _.defaults({}, config); // clone
    var fields = _.keys(list.fields);
    var relationshipFields = _.keys(list.relationships);
    config.methods = parseMixedValue(config.methods, constants.METHODS_ALL, []);
    config.show = parseMixedValue(config.show, fields, []).join(" ");
    config.edit = parseMixedValue(config.edit, fields, []).join(" ");
    config.populate = parseMixedValue(config.populate || false, relationshipFields, []).join(" ");
    config.populateAdv = parseMixedValue(config.populateAdv || false, relationshipFields, false);
    config.envelop = parseMixedValue(config.envelop, "<%=name%>", "");
    
    config.listShow = parseMixedValue(config.listShow, fields,[]).join(" ");
    config.retrieveShow = parseMixedValue(config.retrieveShow, fields, []).join(" ");
    
    config.key = config.key || list.key;
    config.path = config.path || list.path;

    return config;
  }

  return {
    hidden: true
  };
};
