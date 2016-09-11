/**
 * Created by zJJ on 6/22/2016.
 */
const ks = require('keystone');
const E = ks.Field.Types;
var P = new ks.List('Pricing', {
    autokey: {from: 'simplefield', path: 'key', unique: true},
    map: {name: 'simplefield'}
});
P.add({
    outgoing: {type: E.Boolean, label: '上門 (out-going)', default: false},
    timelength: {type: E.Number, label: '分鐘 (mins)', default: 30},
    services: {type: E.Relationship, label: '武器', ref: 'Feature', many: true, initial: true},
    listed: {type: E.Relationship, ref: 'Profile', label: 'Girl Profile'},
    price: {type: E.Number, default: 100, label: '價格單位', required: true},
    currency: {
        type: E.Select, default: 'HKD', label: '貨幣', options: ks.get('currency'),
    },
    simplefield: {
        type: E.Text, index: true, label: 'keyF', required: true, initial: true
    },
    createdAt: {type: E.Datetime, noedit: true, default: Date.now}
});
//Location.relationship({ref: 'Profile', path: 'profile', refPath: 'chinese'});
P.defaultColumns = 'simplefield|4%, listed|4%, currency|2%, price|3%, outgoing|3%, timelength|3%';
P.register();