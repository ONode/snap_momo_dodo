var keystone = require('keystone'),
    T = keystone.Field.Types;

var C = new keystone.List('Coin', {
    map: {name: 'token'},
    nocreate: true,
    defaultSort: '-expire'
});
C.add({
    user: {noedit: true, type: T.Relationship, ref: 'User'},
    token: {noedit: true, type: T.Text, index: true},
    expire: {noedit: true, type: T.Datetime},
    redeem: {noedit: true, type: T.Datetime},
    check_validation: {type: T.Boolean, default: true},
    has_redeem: {type: T.Boolean, default: false},
    amount: {type: T.Number, default: 100, label: '單位', required: true}
});
C.defaultColumns = 'token|30%, has_redeem|3%, check_validation|3%,  user|5%';
C.schema.pre('save', function (next) {
    // if (this.isModified('key') && !this.createdAt) {
    //     this.createdAt = new Date();
    // }
    next();
});
C.register();
