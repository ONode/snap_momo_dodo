/**
 * This file contains the common middleware used by your routes.
 *
 * Extend or replace these functions as your application requires.
 *
 * This structure is not enforced, and just a starting point. If
 * you have more middleware you may want to group it as separate
 * modules in your project's /lib directory.
 */

const querystring = require('querystring');
const keystone = require('keystone');
const crystal = require('crypto-js/sha256');

/**
 Initialises the standard view locals

 The included layout depends on the navLinks array to generate
 the navigation in the header, you may wish to change this array
 or replace it with your own templates / logic.
 */

exports.externalSchema = function (req, res, next) {
    res.locals.navLinks = [
        {label: 'Main', key: 'home', href: '/'}
        //    {label: 'Contact', key: 'contact', href: '/contact'}
    ];
    res.locals.user = req.user;
    next();
};


var _ = require('lodash');

exports.theme = function (req, res, next) {
    if (req.query.theme) {
        req.session.theme = req.query.theme;
    }
    res.locals.themes = [
        'Bootstrap',
        'Cerulean',
        'Cosmo',
        'Cyborg',
        'Darkly',
        'Flatly',
        'Journal',
        'Lumen',
        'Paper',
        'Readable',
        'Sandstone',
        'Simplex',
        'Slate',
        'Spacelab',
        'Superhero',
        'United',
        'Yeti',
    ];
    res.locals.currentTheme = req.session.theme || 'Slate';
    next();
};


/**
 Fetches and clears the flashMessages before a view is rendered
 */

exports.flashMessages = function (req, res, next) {

    var flashMessages = {
        info: req.flash('info'),
        success: req.flash('success'),
        warning: req.flash('warning'),
        error: req.flash('error')
    };

    res.locals.messages = _.any(flashMessages, function (msgs) {
        return msgs.length;
    }) ? flashMessages : false;

    next();
};

/**
 Prevents people from accessing protected pages when they're not signed in
 */
exports.requireUser = function (req, res, next) {
    if (!req.user) {
        req.flash('error', 'Please sign in to access this page.');
        res.redirect('/keystone/signin');
    } else {
        next();
    }
};