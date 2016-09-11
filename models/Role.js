/**
 * Created by Hesk on 2/1/2015.
 */
const ks = require('keystone');
const E = ks.Field.Types;
var Role = new ks.List('Role', {
    autokey: {from: 'name', path: 'key', unique: true}
});
Role.add({
    name: {type: E.Text, initial: true, index: false},
    rolekey: {type: E.Text, initial: true, index: true}
});
Role.relationship({ref: 'User', path: 'roles'});
Role.defaultColumns = 'name|50%, rolekey|50%';
Role.register();