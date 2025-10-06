
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    messageCount: {
        type: Number,
        default: 0
    },
    username: {
        type: String,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
messageSchema.index({ userId: 1, guildId: 1 }, { unique: true });
messageSchema.index({ guildId: 1, messageCount: -1 }); // For leaderboard

const messageSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    excludedChannels: [{
        type: String
    }],
    excludedRoles: [{
        type: String
    }]
}, {
    timestamps: true
});

const MessageCounter = mongoose.model('MessageCounter', messageSchema);
const MessageSettings = mongoose.model('MessageSettings', messageSettingsSchema);

module.exports = {
    MessageCounter,
    MessageSettings
};
