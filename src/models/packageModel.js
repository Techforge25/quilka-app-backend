const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2")

// Schema
const packageSchema = new Schema({
    name: { type: String, trim: true, required: true },
    credits: { type: Number, required: true },
    price: { type: Number, required: true },
    description: { type: String, trim: true },
    extras: { type: String, trim: true }
}, { timestamps: true });

// Add pagination plugin
packageSchema.plugin(aggregatePaginate);

// Model
const Package = model("Package", packageSchema);

module.exports = Package;