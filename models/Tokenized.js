/**
 * Created by hesk on 12/21/2014.
 */
const keystone = require('keystone');
const T = keystone.Field.Types;
var Tokenized = new keystone.List('Tokenized', {
    map: {name: 'token'},
    nocreate: true,
    defaultSort: '-expire'
});
Tokenized.add({
    user: {noedit: true, type: T.Relationship, ref: 'User'},
    token: {noedit: true, type: T.Text, index: true},
    expire: {noedit: true, type: T.Datetime},
    isvalid: {type: T.Boolean},
    object: {
        index: true,
        type: T.Select,
        options: [
            {value: 'registration', label: 'registration'},
            {value: 'login', label: 'login'},
            {value: 'refillcredit', label: 'credit refill'}
        ],
        default: 'registration'
    }
});
Tokenized.defaultColumns = 'object|5%, token|20%, expire|5%, user|5%';
Tokenized.register();