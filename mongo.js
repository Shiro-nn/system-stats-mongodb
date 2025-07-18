const mongoose = require("mongoose"),
Schema = mongoose.Schema;
module.exports = mongoose.model("system-stats", new Schema({
    ip: { type: String, default: '0.0.0.0' },
    uptime: { type: String, default: '' },
    statistics: { type: Array, default: [] }
}));