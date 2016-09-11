/**
 * This file is where you define your application routes and controllers.
 *
 * Start by including the middleware you want to run for every request;
 * you can attach middleware to the pre('routes') and pre('render') events.
 *
 * For simplicity, the default setup for route controllers is for each to be
 * in its own file, and we import all the files in the /routes/views directory.
 *
 * Each of these files is a route controller, and is responsible for all the
 * processing that needs to happen for the route (e.g. loading data, handling
 * form submissions, rendering the view template, etc).
 *
 * Bind each route pattern your application should respond to in the function
 * that is exported from this module, following the examples below.
 *
 * See the Express application routing documentation for more information:
 * http://expressjs.com/api.html#app.VERB
 */

const keystone = require('keystone');
const middleware = require('./middleware.js');
const user_api = require('./util/user_operation.js');
const feature_api = require('./util/smartlistfeaturephoto.js');
const comment_api = require('./util/comment.js');
const image_api = require('./util/imageapi.js');
const price_api = require('./util/pricing.js');
const coins_api = require('./util/creditsystem.js');
const app_api = require('./util/downloadapp.js');
const tag_api = require('./util/featureupdate.js');
const overhead_api = require('./util/overhead.js');
const list_api = require('./util/listing_api.js');
const rest = require('restful-keystone-onode')(keystone, {
    root: "/api/v1"
});
const importRoutes = keystone.importer(__dirname);
// Common Middleware
keystone.pre('render', middleware.theme);
keystone.pre('render', middleware.externalSchema);
keystone.set('404', function (req, res, next) {
    res.status(404).render('errors/404');
});
function initRestfulAPIKeyStone() {
    "use strict";
    rest.expose({
        Profile: {
            populateAdv: {
                path: 'features',
                select: 'display'
            },
            filter: {
                state: 'published'
            },
            methods: ['retrieve', 'list', 'update', 'create']
        },
        User: {
            filter: {
                isAdmin: false
            },
            show: ['cellPhone', 'customization']
        },
        Article: {
            filter: {
                status: 'published'
            },
            populateAdv: {
                path: 'profilesubject',
                select: 'photoprofile chinese english onholiday likecount locationdistrict'
            }
        }
    })

        .before('create', {
            Profile: user_api.create_profile,
            User: user_api.create_user_basic,
            Article: comment_api.create_article_comment_before
        })

        .before('update', {
            Profile: user_api.update_profile_basic,
            User: user_api.update_user_basic
        })
        /* .after('update', {
         Profile: user_api.update_profile_after
         })*/
        .after('create', {
            Profile: user_api.create_profile_after,
            Article: comment_api.create_article_comment_after
        })
        .before('list',
            {
                Profile: list_api.list_profile_before
            }
        )
        .start();
}
// Import Route Controllers
var routes = {
    views: importRoutes('./views'),
    download: importRoutes('./download')
};


var api = {
    token: importRoutes('./api/').token,
    call: importRoutes('./api/call'),
    driver: importRoutes('./api/driver'),
    account: importRoutes('./api/me')
};

// Setup Route Bindings
exports = module.exports = function (app) {
    // Views
    app.get('/', routes.views.index);
    initRestfulAPIKeyStone();
    // app.get('/register/machine/', routes.views.blog);
    // app.get('/blog/post/:post', routes.views.post);
    // app.get('/ticket/:tid', routes.views.ticket);
    // app.get('/gallery', routes.views.gallery);
    // app.all('/contact', routes.views.contact);
    /* app.all('/api/!*', keystone.middleware.api);*/
    // app.get('/download/users', routes.download.users);
    // jwt token authentication for socket.io traffic
    app.all('/api/token*', middleware.requireUser);
    app.all('/api/token', api.token);
    app.post('/api/login', user_api.user_login_short_token);
    //common upload photo
    app.post('/api/v1/pharrjk/:profile_id', image_api.cloudinary_update_image);
    //featured photo upload
    app.post('/api/v1/phspecial/:profile_id', image_api.cloudinary_update_image_featured);
    //profile photo upload
    app.post('/api/v1/phsingleup/:profile_id', image_api.cloudinary_update_image_profile);
    app.post('/api/v1/ft/:profile_id', tag_api.update_features_me);

    app.get('/api/v1/ft/:profile_id', tag_api.list_ft_profile_me);
    app.get('/api/main/v1/overhead', overhead_api.start_api);
    app.get('/api/v1/like/:profile_id', tag_api.addlike);
    app.get('/api/setting/addrole/:role_name', user_api.update_basic_normal_special_user);
    app.get('/api/checkversion/android/', app_api.check_android);
    app.get('/api/checkversion/iphone/', app_api.check_ios_iphone);
    app.get('/api/v1/hotfeaturedimages/', feature_api.list_feature_images);

    app.get('/api/v1/pricemodel/:profile_id', price_api.pricingread);
    app.delete('/api/v1/pricemodel/:price_id/:profile_id', price_api.pricingremove);
    app.post('/api/v1/pricemodel/:profile_id', price_api.pricingadd);
    app.patch('/api/v1/pricemodel/:price_id/:profile_id', price_api.pricingupdate);

    app.get('/api/v1/coin/issue/', coins_api.req_issue_coins);
    app.get('/api/v1/coin/redeem/:user_id/:code', coins_api.req_redeem_issue);
    app.get('/api/v1/coin/check/unused', coins_api.req_list_all_available_tokens);
    app.get('/api/v1/system/tokens/cleanup', user_api.clean_up_tokens);

    //have to login
    app.get('/api/v1/coin/rose/buy', coins_api.req_buy_rose);
    app.get('/api/v1/coin/rose/send/profile/:profile_id', coins_api.req_give_rose_to_profile);
    app.get('/api/v1/coin/rose/send/user/:user_id', coins_api.req_give_rose_to_user);
};
