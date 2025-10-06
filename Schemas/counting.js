
const mongoose = require('mongoose');

const countingSchema = new mongoose.Schema({
    Guild: {
        type: String,
        required: true,
        unique: true
    },
    Channel: {
        type: String,
        required: true
    },
    Count: {
        type: Number,
        default: 0
    },
    LastUser: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Counting', countingSchema);
