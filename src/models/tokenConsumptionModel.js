const { Schema, model } = require("mongoose");

// Schema
const tokenConsumptionSchema = new Schema({
    // References
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    bookId: { type: Schema.Types.ObjectId, ref: "Book" },

    // Tokens
    totalTokens: { type: Number, required: true }
}, { timestamps: true });

// Model
const TokenConsumption = model("TokenConsumption", tokenConsumptionSchema);

module.exports = TokenConsumption;