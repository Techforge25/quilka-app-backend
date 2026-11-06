const TokenConsumption = require("../models/tokenConsumptionModel");
const ApiError = require("./ApiError");

// Save token consumption into db
const saveTokenConsumption = async (userId, bookId, totalTokens) => {
    try
    {
        if(!userId) throw new ApiError(400, "User ID is missing");
        if(!bookId) throw new ApiError(400, "Book ID is missing");
        if(!totalTokens) throw new ApiError(400, "Total tokens are missing");

        // Create
        const tokenConsumption = await TokenConsumption.create({ userId, bookId, totalTokens });
        if(!tokenConsumption) throw new ApiError(500, "Failed to save token consumption");
    }
    catch(error)
    {
        throw error;
    }
};

module.exports = { saveTokenConsumption };