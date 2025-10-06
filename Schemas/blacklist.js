
const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['user', 'server'],
        required: true
    },
    targetId: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: 'No reason provided'
    },
    addedBy: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
