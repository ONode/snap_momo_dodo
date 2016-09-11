const ks = require('keystone');
const E = ks.Field.Types;
var Feature = new ks.List('Feature', {
    autokey: {from: 'name', path: 'display', unique: true},
    map: {name: 'display'},
    sortable: true
});
Feature.add({
    display: {type: E.Text, initial: true, index: true},
    weight: {type: E.Number, initial: true,label: 'Weight point that based on GA'},
    english: {type: E.Text},
    japanese: {type: E.Text},
    chinese_s: {type: E.Text},
    price_lv1: {type: E.Boolean, label: '價格標籤 Lv1'},
    price_lv2: {type: E.Boolean, label: '價格標籤 Lv2'},
    facilities: {type: E.Boolean, label: '施設'},
    phonepolicy: {type: E.Boolean, label: '手機政策'},
    customerpolicy: {type: E.Boolean, label: '客戶政策'},
    admin: {type: E.Boolean, label: '只有管理員'}
});
Feature.relationship({ref: 'Profile', path: 'profiles', refPath: 'features', label: 'Display Label for Profile'});
Feature.defaultColumns = 'display|30%, admin|5%,price_lv1|5%, price_lv2|5%';
Feature.register();