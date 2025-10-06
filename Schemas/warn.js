
const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    moderatorId: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: 'No reason provided'
    },
    warnId: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create compound index for efficient queries
warnSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model('Warn', warnSchema);
