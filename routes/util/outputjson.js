/**
 * Created by zJJ on 4/6/2016.
 */
"use strict";
const ks = require('keystone');
var response_emit_error_object = function (emitting_message) {
    return {
        action_success: false,
        timestamp: new Date().getTime(),
        message: emitting_message
    };
};
var response_success_object = function (data_object) {
    return {
        action_success: true,
        timestamp: new Date().getTime(),
        message: "success",
        result: data_object
    };
};

var response_success_object_message = function (message_success, data_object) {
    return {
        action_success: true,
        timestamp: new Date().getTime(),
        message: message_success,
        result: data_object
    };
};

var res_success = function (data, res) {
    return res.json(response_success_object(data));
};
var res_error = function (error_mo, res) {
    return res.json(response_emit_error_object(error_mo));
};
var res_success_message = function (data, message, res) {
    return res.json(response_success_object_message(message, data));
};
exports.resError = response_emit_error_object;
exports.resDataSuccess = response_success_object;
exports.outResErro = res_error;
exports.outResSuccess = res_success;
exports.outResSuccessWithMessage = res_success_message;