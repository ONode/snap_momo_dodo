// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
try {
    require('dotenv').config();
} catch (e) {

}
const keystone = require('keystone');
const main_con = require('./lib/configinit.json');
//var restyStone = require("resty-stone")(keystone);
// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.
//"jwtTokenSecret": "234Ufs(99#@@#*&@9F9855456460V"
//"ga property": process.env.GA_PROPERTY,
//"ga domain": process.env.GA_DOMAIN,
//"chartbeat property": process.env.CHARTBEAT_PROPERTY,
//"chartbeat domain": process.env.CHARTBEAT_DOMAIN
keystone.init(main_con);
// Load your project's Models
keystone.import('models');
// Setup common locals for your templates. The following are required for the
// bundled templates and layouts. Any runtime locals (that should be set uniquely
// for each request) should be added to ./routes/middleware.js
keystone.set('locals', {
    _: require('lodash'),
    env: keystone.get('env'),
    utils: keystone.utils,
    editable: keystone.content.editable
    //chartbeat_property: keystone.get('chartbeat property'),
    //chartbeat_domain: keystone.get('chartbeat domain')
});
// Setup common locals for your emails. The following are required by Keystone's
// default email templates, you may remove them if you're using your own.
keystone.set('email locals', {
    logo_src: '/images/9TRzaXMdc.png',
    logo_width: 176,
    logo_height: 288,
    theme: {
        email_bg: '#f9f9f9',
        link_color: '#2697de',
        buttons: {
            color: '#fff',
            background_color: '#2697de',
            border_color: '#1a7cb7'
        }
    }
});
keystone.set('cors allow origin', true);
// Configure the navigation bar in Keystone's Admin UI
keystone.set('nav', {
    'user': ['users', 'tokenizeds'],
    'main': ['profiles', 'features', 'enquiries', 'articles', 'pricings']
});
keystone.set('routes', require('./routes'));
//keystone.set('resty api base address', "/api");
//keystone.set('resty meta location', "./models");
//keystone.set('resty token header', "api-token");
keystone.set('jwtTokenSecret', '234U~s(99#@@#*&@9F9_GG^EB3-5646=0V'); // put in something hard to guess
keystone.start();
