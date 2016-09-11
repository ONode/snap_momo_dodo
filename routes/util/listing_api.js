const _ = require('lodash');
const control_query_tag = "l";
const tag = "pre_filter";
const filter_control_tag = "filter";
/**
 * Created by zJJ on 7/12/2016.
 */
var profile_list = function (req, res, next) {
    var filter_extra = {};
    if (!_.isEmpty(req.query[control_query_tag])) {

        if (!_.isEmpty(req.query[filter_control_tag])) {
            filter_extra = JSON.parse(req.query[filter_control_tag]);
        }

        if (_.isEqual(req.query[control_query_tag], "home")) {
            filter_extra = _.extend({
                onholiday: false
            }, filter_extra);

            req.query[filter_control_tag] = JSON.stringify(filter_extra);
        }
        if (_.isEqual(req.query[control_query_tag], "sort")) {
            req.query[filter_control_tag] = JSON.stringify(filter_extra);
        }
    }
   // console.log(tag, filter_extra);
    next();
};
exports.list_profile_before = profile_list;