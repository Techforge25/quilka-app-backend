const { allowedTokenConsumptionTypes } = require("../constants");
const TokenConsumption = require("../models/tokenConsumptionModel");
const ApiError = require("./ApiError");

// Save token consumption into db
const saveTokenConsumption = async (userId, bookId, aiModel, type, totalSpreads, usage, costing) => {
    try
    {
        if(!userId) throw new ApiError(500, "User ID is missing");
        if(!bookId) throw new ApiError(500, "Book ID is missing");
        if(!type) throw new ApiError(500, "Token consumption type is required");
        if(!allowedTokenConsumptionTypes.includes(type)) throw new ApiError(500, "Invalid token consumption type");

        // Create
        const tokenConsumption = await TokenConsumption.create({ 
            userId,
            bookId,
            aiModel,
            type,
            totalSpreads: totalSpreads ? totalSpreads : undefined,
            usage,
            costing
        });
        if(!tokenConsumption) throw new ApiError(500, "Failed to save token consumption");
    }
    catch(error)
    {
        throw error;
    }
};

module.exports = { saveTokenConsumption };