const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const bookSchema = new Schema({
    // Reference
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Book creation mode & status
    mode: { type: String, trim: true, required: true, enum: ["CUSTOM", "AI"] },
    status: { type: String, trim: true, required: true, enum: ["pending", "draft", "published"], default: "pending" },

    // Basic info
    title: { type: String, trim: true, required: true, index: true },
    authorName: { type: String, trim: true, required: true },
    spreadsCount: { type: Number, required: true },
    txtContent: { type: String, trim: true },
    aiContent: { type: String, trim: true },
    storyContent: { type: String, trim: true },

    // Metadata
    ageGroup: { type: String, trim: true, required: true },
    bookSize: { type: String, trim: true, required: true },
    illustrationStyle: { type: String, trim: true, required: true },
    language: { type: String, trim: true, required: true, enum: ["English", "Arabic", "Spanish", "Hindi", "Afrikaans"] },

    // Spreads config
    spreads: [{
        chararacterLimit: { type: Number },
        layout: {
            name: { type: String, trim: true, required: true }, // Classic story book
            subLayout: { type: String, trim: true, required: true }, // Right-content, Left-content
        }
    }]
}, { timestamps: true });

// Add pagination plugin
bookSchema.plugin(aggregatePaginate);

// Model
const Book = model("Book", bookSchema);

module.exports = Book;