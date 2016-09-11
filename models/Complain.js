/**
 * Created by hesk on 1/26/2015.
 */
var keystone = require('keystone'),
    Types = keystone.Field.Types;
var Complain = new keystone.List('Complain', {
    nocreate: false,
    noedit: false
});

Complain.add({
    customer: {type: Types.Relationship, ref: 'User', label: "Client", noedit: true},
    performer: {type: Types.Relationship, ref: 'User', label: "Performer", noedit: true},
    reportTime: {type: Types.Datetime, default: Date.now, noedit: true, label: "Report Issue Time"},
    issueContent: {type: Types.Text, label: "Content of Issue"},
    status: {
        initial: true, required: true,
        type: Types.Select,
        options: [
            {value: 'new', label: 'new case'},
            {value: 'reviewed', label: 'reviewed'},
            {value: 'resolved', label: 'resolved'}
        ],
        label: "Status of Issue",
        default: 'new'
    }
});
Complain.defaultColumns = 'status|20%, customer|20%, issueContent|30%';
Complain.schema.pre('save', function (next) {
    // if (this.isModified('key') && !this.createdAt) {
    //     this.createdAt = new Date();
    // }
    next();
});
Complain.register();