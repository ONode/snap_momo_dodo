const ks = require('keystone');
const T = ks.Field.Types;
/**
 * ==========
 * User Model
 * ==========
 */
var User = new ks.List('User', {roles: ['administrator']});
User.add(
    'Basics',
    {
        name: {type: T.Name, required: true, index: true},
        email: {type: T.Email, initial: true, required: true, index: true, label: '* password recovery'},
        password: {type: T.Password, initial: true, required: true, label: '* internal activation'},
        cellPhone: {type: T.Text, label: '* unique cell phone number'},
        macId: {type: T.Text, label: 'MAC address'},
        bitcoinwalletid: {type: T.Text, label: 'Bitcoin address', noedit: true},
        ltecoinwalletid: {type: T.Text, label: 'Ltecoin address', noedit: true},
        customization: {type: T.Color, label: 'user theme color'}
    },
    'Permissions',
    {
        state: {
            type: T.Select,
            options: [
                {value: 'enabled', label: 'Enabled'},
                {value: 'disabled', label: 'Disabled'}
            ],
            default: 'enabled'
        },
        isVerified: {type: T.Boolean, label: 'Account Verification'},
        isAdmin: {type: T.Boolean, label: 'Can access Keystone', index: true},
        // roles: {type: T.Relationship, ref: 'Role', many: true, initial: true, default: ['Client']}
        roles: {type: T.Select, options: ks.get('CMS roles')}
    }, 'Credits', {
        rose: {type: T.Number, label: 'rose wallet', noedit: true, default: 0},
        //this is the coin count for the normalized system
        walletcoins: {type: T.Number, label: 'wallet coins', noedit: true}
    }
);
//User.relationship({ref: 'Product', path: 'issuer'});
// Provide access to Keystone
User.schema.virtual('canAccessKeystone').get(function () {
    return this.isAdmin;
});

/**
 * Relationships
 */
User.relationship({ref: 'Tokenized', path: 'tokenizeds', refPath: 'user'});

/**
 * Registration
 */
User.defaultColumns = 'name, cellPhone, email, roles';
User.register();