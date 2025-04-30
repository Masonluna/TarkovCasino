const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    userId: { type: String, require: true, unique: true },
    serverId: { type: String, require: true },
    registered: { type: Boolean, default: false },
    dailyLastUsed: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
});

const model = mongoose.model("TarkovCasino", profileSchema);

module.exports = model;