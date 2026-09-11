const { Schema, model } = require("mongoose");

// Schema
const regenerationSchema = new Schema({
    // References
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },

    // Limitations
    limit: { type: Number, required: true, default: 5 }
}, { timestamps: true });

// Model
const Regeneration = model("Regeneration", regenerationSchema);

module.exports = Regeneration;