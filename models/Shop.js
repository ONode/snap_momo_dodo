/**
 * Created by zJJ on 7/12/2016.
 */
const ks = require('keystone');
const _ = require('lodash');
const E = ks.Field.Types;
var Shop = new ks.List('Shop', {
        autokey: {from: 'chinese', path: 'key', unique: true},
        map: {name: 'chinese'},
        watch: {
            chinese: {
                onRemoveTarget: function (target) {
                    console.log('Oh noes! I lost my author!');
                }
            }
        }
    }
);
const listDistrictOptions = function () {
    "use strict";
    var h = ks.get('district_hk_islandhk');
    var b = ks.get('district_hk_kowloon');
    var c = ks.get('district_hk_nt');
    var d = ks.get('district_jp_tokyo');
    var e = ks.get('district_jp_osaka');
    var f = ks.get('district_tha');
    var g = ks.get('district_usa_vegas');
    return h.concat(b,c,d,e,f,g);
};
Shop.add({
    createdAt: {type: E.Datetime, noedit: true, default: Date.now},
    inoperation: {type: E.Boolean, label: '放假中'},
    likecount: {type: E.Number, label: "Like COUNTS"},
    loc: {type: E.GeoPoint, defaults: {country: 'Japan'}},
    chinese: {type: E.Text, initial: true, index: true, required: true, label: '方名'},
    english: {type: E.Text, initial: true, label: 'AD LINE'},
    state: {type: E.Select, options: ks.get('item_status'), default: ks.get('item_status')[0]},
    number: {type: E.Number, label: '電話'},
    languages: {
        label: '語言', type: E.Select, options: ks.get('CMS languages'),
        many: true
    },
    country: {
        label: '國籍', type: E.Select, options: ks.get('CMS countries')
    },
    locationdistrict: {
        label: 'District',
        type: E.Select,
        options: listDistrictOptions()
    },
    locationstreet: {
        label: '專用街道地址', type: String
    },
    features: {type: E.Relationship, label: '招式武器', ref: 'Feature', many: true, initial: true},
    schedule: {type: String, label: '時間表'},
    brief: {type: E.Html, wysiwyg: true, height: 150},
    photo: {type: E.CloudinaryImages, label: '自拍寫真'},
    photofeature: {type: E.CloudinaryImages, label: '專賣區之相'},
    photoprofile: {type: E.CloudinaryImage, label: '頭像', autoCleanup: true}
});
Shop.relationship({ref: 'Profile', path: 'profiles', refPath: 'wp', label: 'Office Location'});
Shop.defaultColumns = 'chinese, state|15%, likecount|5%, createdAt|10%';
Shop.register();