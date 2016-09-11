const ks = require('keystone');
const asy = require('async');
const settings = require('./../lib/default_settings.json');
/**
 * This script automatically creates a default Admin user when an
 * empty database is used for the first time. You can use this
 * technique to insert data into any List you have defined.
 *
 * Alternatively, you can export a custom function for the update:
 * module.exports = function(done) { ... }
 */
exports = module.exports = function (done) {
    asy.forEach(settings.roles, function (src, done) {
        var r = new ks.list('Role').model(src);
        r.name = src.name;
        r.rolekey = src.ref;
        r.save(function (err) {
            if (err) {
                console.error("Error adding Role " + src.name + " to the database:");
                console.error(err);
            } else {
                console.log("Added Role " + r.name + " to the database.");
            }
            done(err);
        });
    }, done);
    asy.forEach(settings.admins,
        function (admin, done) {
            var newAdmin = new ks.list('User').model(admin);
            newAdmin.isAdmin = true;
            newAdmin.save(function (err) {
                if (err) {
                    console.error("Error adding admin " + admin.email + " to the database:");
                    console.error(err);
                } else {
                    console.log("Added admin " + admin.email + " to the database.");
                }
                done(err);
            });
        }
        , done);
};
