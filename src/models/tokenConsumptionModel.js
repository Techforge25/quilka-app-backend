const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { allowedTokenConsumptionTypes, consumptionType } = require("../constants");

// Required condition for Total Spreads Field
function areTotalSpreadsRequired()
{
    return this.type === consumptionType.text || this.type === consumptionType.illustration;
}

// Schema
const tokenConsumptionSchema = new Schema({
    // References
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },

    // Metadata
    aiModel: { type: String, trim: true, required: true },
    type: { type: String, trim: true, required: true, enum: allowedTokenConsumptionTypes },
    totalSpreads: { type: Number, required: areTotalSpreadsRequired },

    // Usage
    promptTokens: { type: Number, required: true },
    candidatesTokens: { type: Number, required: true },
    thoughtsTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true }
}, { timestamps: true });

// Add pagination plugin
tokenConsumptionSchema.plugin(aggregatePaginate);

// Model
const TokenConsumption = model("TokenConsumption", tokenConsumptionSchema);

module.exports = TokenConsumption;