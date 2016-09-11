/**
 * Created by hesk on 29/3/16.
 */
const ks = require('keystone');
const E = ks.Field.Types;
var art = new ks.List('Article', {
    autokey: {from: 'name', path: 'key', unique: true},
    map: {name: 'title'}
});
art.add({
    title: {type: E.Text, index: true, label: "标题"},
    status: {type: E.Select, options: ks.get('item_status'), default: ks.get('item_status')[0]},
    report_type: {type: E.Select, options: ks.get('doc_type'), default: ks.get('doc_type')[0]},
    block: {type: E.Text, height: 300, label: "內容"},
    profilesubject: {type: E.Relationship, label: "囡囡", ref: "Profile", initial: true},
    author: {type: E.Relationship, noedit: true, ref: 'User', label: '注評'},
    likes: {type: E.Number, label: "Like數"},
    rateoverall: {type: E.Number, label: "整體等級"},
    rate_1: {type: E.Number, label: "樣貌"},
    rate_2: {type: E.Number, label: "身材"},
    rate_3: {type: E.Number, label: "態度"},
    rate_4: {type: E.Number, label: "返食率"},
    rate_5: {type: E.Number, label: "CP率"},
    paid: {type: E.Number, label: "payment made"},
    awardedsticker: {type: E.Relationship, label: '赞同招式', ref: 'Feature', many: true, initial: true},
    createdAt: {type: E.Datetime, default: Date.now},
    show_star_chart: {type: E.Boolean, label: 'Star Chart'}
});
//art.relationship({ref: 'Profile', path: 'profile', refPath: 'display' });
art.defaultColumns = 'title|10%, profilesubject|10%, likes|10%, rateoverall|9%, createdAt|13%';
art.register();
//keystone.list('Profile').model.find().populate('Feature').sort('name')