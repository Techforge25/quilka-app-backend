const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { allowedTextSizes } = require("../constants");

// Schema
const spreadSchema = new Schema({
    // Reference
    bookId: { type: Schema.Types.ObjectId, ref: "Book", index: true, required: true },

    // Basic info
    mainLayoutName: { type: String, trim: true, required: true }, // Classic story book
    subLayoutDirection: { type: String, trim: true, required: true }, // Right-content, Left-content
    content: { type: String, trim: true, default: null },

    // Illustration
    illustrationURL: { type: String, trim: true, default: null },
    illustrationSize: {
        size: { type: String, trim: true },
        aspectRatio: { type: String, trim: true }
    },

    // Sizes and limit
    textSize: { type: String, trim: true, enum: allowedTextSizes, default: "Small" },
    characterLimit: { type: Number },
    illustrationLimit: { type: Number },    

    // Colors
    textColor: { type: String, trim: true, default: "#211827" },
    textBgColor: { type: String, trim: true, default: "#FFF0F0" }
}, { timestamps: true });

// Add pagination plugin
spreadSchema.plugin(aggregatePaginate);

// Model
const Spread = model("Spread", spreadSchema);

module.exports = Spread;