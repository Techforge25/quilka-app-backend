const { Schema, model } = require("mongoose");

// Schema
const revenueGenerationSchema = new Schema({
    // Reference
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Revenue info
    revenue: { type: Number, required: true },
    generateFrom: { type: String, trim: true, enum: ["Book", "Regeneration"], required: true },

    // Payment info
    paymentGateway: { type: String, trim: true, enum: ["Apple Pay", "Google Pay"],  required: true },
    transactionId: { type: String, trim: true, required: true },
}, { timestamps: true });

// Model
const RevenueGeneration = model("RevenueGeneration", revenueGenerationSchema);

module.exports = RevenueGeneration;