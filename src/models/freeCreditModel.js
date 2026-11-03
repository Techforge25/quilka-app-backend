const { Schema, model } = require("mongoose");

// Schema
const freeCreditSchema = new Schema({
    credits: { type: Number, required: true },
    enable: { type: Boolean, enum: [true, false], default: true }
}, { timestamps: true });

// Model
const FreeCredit = model("FreeCredit", freeCreditSchema);

module.exports = FreeCredit;