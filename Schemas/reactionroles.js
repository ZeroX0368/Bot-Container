
const mongoose = require('mongoose');

const reactionRolesSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        required: true
    },
    messageId: {
        type: String,
        default: null
    },
    roles: [{
        type: String
    }]
}, {
    timestamps: true
});

// Remove any existing indexes on panelName if they exist
reactionRolesSchema.index({ panelName: 1 }, { sparse: true });

module.exports = mongoose.model('ReactionRoles', reactionRolesSchema);
