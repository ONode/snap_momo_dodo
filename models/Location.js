/**
 * this is the group of the location groups to be managed
 * Created by zJJ on 3/25/2016.
 */
const ks = require('keystone');
const E = ks.Field.Types;
var Location = new ks.List('Location', {
    autokey: {from: 'map_symbol', path: 'map_symbol', unique: true},
    map: {name: 'english'}
});
Location.add({
    map_symbol: {label: 'AKA key name', type: E.Text},
    country: {label: '國家', type: E.Select, options: ks.get('CMS countries')},
    native_language: {label: '中文名', type: E.Text},
    english: {label: '英文名', type: E.Text, index: true, required: true, initial: true},
    banner_front: {type: E.CloudinaryImages, label: '橫幅頁面字體'},
    createdAt: {type: E.Datetime, noedit: true, default: Date.now}
});
//Location.relationship({ref: 'Profile', path: 'profile', refPath: 'chinese'});
Location.defaultColumns = 'english|30%, native_language|30%, country|20%, map_symbol|10%';
Location.register();
