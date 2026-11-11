const { allowedTokenConsumptionTypes } = require("../constants");
const TokenConsumption = require("../models/tokenConsumptionModel");
const ApiError = require("./ApiError");

// Save token consumption into db
const saveTokenConsumption = async (userId, bookId, totalTokens, type) => {
    try
    {
        if(!userId) throw new ApiError(500, "User ID is missing");
        if(!bookId) throw new ApiError(500, "Book ID is missing");
        if(!type) throw new ApiError(500, "Token consumption type is required");
        if(!allowedTokenConsumptionTypes.includes(type)) throw new ApiError(500, "Invalid token consumption type");
        if(!totalTokens) throw new ApiError(500, "Total tokens are missing");

        // Create
        const tokenConsumption = await TokenConsumption.create({ userId, bookId, totalTokens, type });
        if(!tokenConsumption) throw new ApiError(500, "Failed to save token consumption");
    }
    catch(error)
    {
        throw error;
    }
};

module.exports = { saveTokenConsumption };