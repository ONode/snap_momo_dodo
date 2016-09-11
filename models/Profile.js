/**
 * Created by zJJ on 3/25/2016.
 */
const ks = require('keystone');
const _ = require('lodash');
const E = ks.Field.Types;
var Profile = new ks.List('Profile', {
        autokey: {from: 'chinese', path: 'key', unique: true},
        map: {name: 'chinese'},
        // roles: ['performer'],
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
Profile.add({
    createdAt: {type: E.Datetime, noedit: true, default: Date.now},
    access: {type: E.Relationship, noedit: true, ref: 'User', label: 'Girl'},
    onholiday: {type: E.Boolean, label: '放假中'},
    verified: {type: E.Boolean, label: 'verified person'},
    likecount: {type: E.Number, label: "Like COUNTS"},
    rosecount: {type: E.Number, label: "Rose COUNTS"},
    loc: {type: E.GeoPoint, defaults: [0,0]},
    chinese: {type: E.Text, initial: true, index: true, required: true, label: '方名'},
    english: {type: E.Text, initial: true, label: 'AD LINE'},
    state: {type: E.Select, options: ks.get('item_status'), default: ks.get('item_status')[0]},
    a: {type: E.Number, label: '上', noedit: true, required: true, default: 20, width: 'small'},
    b: {type: E.Number, label: '中', noedit: true, required: true, default: 20, width: 'small'},
    c: {type: E.Number, label: '下', noedit: true, required: true, default: 20, width: 'small'},
    cupsize: {type: E.Select, options: ks.get('CMS sizes'), label: '型', default: 'A'},
    height: {type: E.Text, label: '高度（cm）'},
    number: {type: E.Number, label: '電話'},
    callrule: {
        label: '電話則', type: E.Select, options: [1, 2, 3]
    },
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
    /**
     * this is the work place
     */
    wp: {type: E.Relationship, label: 'Office', ref: 'Shop', many: true, initial: true},
    // promotionvoice: {type: E.AzureFile, label: '真淫乳音'},
    schedule: {type: String, label: '時間表'},
    brief: {type: E.Html, wysiwyg: true, height: 150},
    bodycheck: {type: E.Date, label: '體驗'},
    photo: {type: E.CloudinaryImages, label: '自拍寫真'},
    photofeature: {type: E.CloudinaryImages, label: '專賣區之相'},
    photoprofile: {type: E.CloudinaryImage, label: '頭像', autoCleanup: true}
});
Profile.defaultColumns = 'chinese, state|15%, access|6%, likecount|5%, createdAt|10%';
Profile.register();
/**
 Profile.customAction('Archive', function(req, res, next) {
    var item = req.items[0];
    item.status = 'archived';
    item.save(function(err) {
        if (err) {
            throw new Error("Couldn't archive this post!");
        }

        next('Post was archived successfully!');
    })
})
 **/