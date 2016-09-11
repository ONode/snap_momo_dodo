/**
 * Created by zJJ on 4/3/2016.
 */
"use strict";
module.exports = function (req) {
  return new RegExp("^[0-9a-fA-F]{24}$").test(req);
};
