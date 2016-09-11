/**
 * Created by zJJ on 4/16/2016.
 */
"use strict";

module.exports = function (req) {
    return req.params["profile_id"] || req.query["profile_id"] || ( req.body && req.body["profile_id"] );
};