"use strict";
const _ = require("lodash");

/**
 *
 * @param {boolean|string|string[]} value
 * @param defaultValue
 * @param emptyValue
 * @returns {*}
 */
module.exports = function parseMixedValue(value, defaultValue, emptyValue) {
  if (_.isUndefined(value)) {
    value = true;
  }

  if (_.isString(value)) {
    value = value.split(" ");
  } else if (_.isBoolean(value)) {
    value = ( value )
      ? defaultValue
      : emptyValue;
  }
  return value;
};

_.deepObjectExtend = function (target, source) {
  for (var prop in source)
    if (prop in target)
      _.deepObjectExtend(target[prop], source[prop]);
    else
      target[prop] = source[prop];
  return target;
};