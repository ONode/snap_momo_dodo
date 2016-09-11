/**
 * Created by zJJ on 4/16/2016.
 */
"use strict";

module.exports = function (req) {
    return req.params["role_name"] || req.query["role_name"] || ( req.body && req.body["role_name"] );
};