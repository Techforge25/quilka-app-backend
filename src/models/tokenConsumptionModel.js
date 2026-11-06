const { Schema, model } = require("mongoose");

// Schema
const tokenConsumptionSchema = new Schema({
    // References
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },

    // Tokens
    totalTokens: { type: Number, required: true }
}, { timestamps: true });

// Model
const TokenConsumption = model("TokenConsumption", tokenConsumptionSchema);

module.exports = TokenConsumption;