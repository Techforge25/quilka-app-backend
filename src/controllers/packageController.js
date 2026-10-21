const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const Package = require("../models/packageModel");
const { emptyList } = require("../constants");

// Fetch packages
const fetchPackages = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const packages = await Package.aggregatePaginate([
        // Sort
        { $sort: { created: 1 } },

        // Projection
        {
            $project: {
                name: 1,
                credits: 1,
                price: 1,
                description: 1,
                extras: 1
            }
        },
    ], { page, limit });
    if(!packages.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No packages found"));

    // Response
    return response.status(200).json(new ApiResponse(200, packages, "Packages have been fetched"));
});

module.exports = { fetchPackages };