const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    userId: { type: String, require: true, unique: true },
    serverId: { type: String, require: true },
    balance: { type: Number, default: 100000 }
});

const model = mongoose.model("TarkovCasino", profileSchema);

module.exports = model;