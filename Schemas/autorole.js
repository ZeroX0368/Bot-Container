
const mongoose = require('mongoose');

const autoroleSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    humans: [{
        type: String
    }],
    bots: [{
        type: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Autorole', autoroleSchema);
