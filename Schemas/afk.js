
const mongoose = require('mongoose');

const afkSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: 'No reason provided'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    mentions: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Create compound index for guild-user combination
afkSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AFK', afkSchema);
