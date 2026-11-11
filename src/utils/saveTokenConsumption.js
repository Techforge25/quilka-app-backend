const { allowedTokenConsumptionTypes } = require("../constants");
const TokenConsumption = require("../models/tokenConsumptionModel");
const ApiError = require("./ApiError");

// Save token consumption into db
const saveTokenConsumption = async (userId, bookId, aiModel, type, totalSpreads, usage) => {
    // Extract usage
    const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = usage || {};

    try
    {
        if(!userId) throw new ApiError(500, "User ID is missing");
        if(!bookId) throw new ApiError(500, "Book ID is missing");
        if(!type) throw new ApiError(500, "Token consumption type is required");
        if(!allowedTokenConsumptionTypes.includes(type)) throw new ApiError(500, "Invalid token consumption type");
        if(!promptTokenCount) throw new ApiError(500, "Prompt tokens are missing");
        if(!candidatesTokenCount) throw new ApiError(500, "Candidates tokens are missing");
        if(!thoughtsTokenCount) throw new ApiError(500, "Thoughts tokens are missing");
        if(!totalTokenCount) throw new ApiError(500, "Total tokens are missing");

        // Create
        const tokenConsumption = await TokenConsumption.create({ 
            userId,
            bookId,
            aiModel,
            type,
            totalSpreads: totalSpreads ? totalSpreads : undefined,
            promptTokens: promptTokenCount,
            candidatesTokens: candidatesTokenCount,
            thoughtsTokens: thoughtsTokenCount,
            totalTokens: totalTokenCount
        });
        if(!tokenConsumption) throw new ApiError(500, "Failed to save token consumption");
    }
    catch(error)
    {
        throw error;
    }
};

module.exports = { saveTokenConsumption };