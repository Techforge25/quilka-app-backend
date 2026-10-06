const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { allowedBookSizes, allowedIllustrationStyles, allowedIllustrationSizes, allowedTextSizes } = require("../constants");

// Schema
const bookSchema = new Schema({
    // Reference
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Book creation mode & status
    mode: { type: String, trim: true, required: true, enum: ["CUSTOM", "AI"] },
    status: { type: String, trim: true, required: true, enum: ["pending", "draft", "published"], default: "pending" },
    draftStage: { type: Number, default: 0 },

    // Basic info
    title: { type: String, trim: true, required: true, index: true },
    authorName: { type: String, trim: true, required: true },
    spreadsCount: { type: Number, required: true },

    // Content info
    txtContent: { type: String, trim: true },
    prompt: { type: String, trim: true, default: null },
    aiContent: { type: String, trim: true, default: null },

    // Metadata
    ageGroup: { type: String, trim: true, required: true },
    bookSize: { type: String, trim: true, required: true, enum: allowedBookSizes },
    illustrationStyle: { type: String, trim: true, required: true, enum: allowedIllustrationStyles },
    language: { type: String, trim: true, required: true, enum: ["English", "Arabic", "Spanish", "Hindi", "Afrikaans"] },

    // Media
    frontImage: { type: String, trim: true, default: null },
    backImage: { type: String, trim: true, default: null },

    // First time AI usage flag
    hasUsedAi: { type: Boolean, default: false },

    // Spreads config
    spreads: [{
        mainLayoutName: { type: String, trim: true, required: true }, // Classic story book
        subLayoutDirection: { type: String, trim: true, required: true }, // Right-content, Left-content

        // Limit
        characterLimit: { type: Number },
        illustrationLimit: { type: Number },

        // Sizes
        illustrationSize: { type: String, trim: true, enum: allowedIllustrationSizes }, // 100 x 200 | 400 x 600
        textSize: { type: String, trim: true, enum: allowedTextSizes }
    }]
}, { timestamps: true });

// Add pagination plugin
bookSchema.plugin(aggregatePaginate);

// Model
const Book = model("Book", bookSchema);

module.exports = Book;