const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Required condition for Package ID
function isPackageIdRequired()
{
    return this.sourceModel === "Regeneration";
}

// Schema
const revenueGenerationSchema = new Schema({
    // Reference
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    packageId: { type: Schema.Types.ObjectId, ref: "Package", required: isPackageIdRequired },

    // Revenue info
    revenue: { type: Number, required: true },
    sourceId: { type: Schema.Types.ObjectId, refPath: "sourceModel", required: true },
    sourceModel: { type: String, trim: true, enum: ["Book", "Regeneration"], required: true },

    // Payment info
    paymentGateway: { type: String, trim: true, enum: ["Apple Pay", "Google Pay"],  required: true },
    transactionId: { type: String, trim: true, required: true },
    status: { type: String, trim: true, enum: ["pending", "paid", "failed"], default: "pending" }
}, { timestamps: true });

// Add pagination plugin
revenueGenerationSchema.plugin(aggregatePaginate);

// Model
const RevenueGeneration = model("RevenueGeneration", revenueGenerationSchema);

module.exports = RevenueGeneration;