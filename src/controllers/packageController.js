const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const Package = require("../models/packageModel");
const { emptyList } = require("../constants");
const { getCache, setCache } = require("../redis/redisHelpers");

// Fetch packages
const fetchPackages = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get from cache
    const key = `packages:page:${page}:limit:${limit}`;
    let packages = await getCache(key);
    if(!packages)
    {
        // Get from DB
        packages = await Package.aggregatePaginate([
            // Sort
            { $sort: { createdAt: 1 } },

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

        // Set in cache
        await setCache(key, packages, 60 * 24 * 7);
    }
    if(!packages.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No packages found"));

    // Response
    return response.status(200).json(new ApiResponse(200, packages, "Packages have been fetched"));
});

module.exports = { fetchPackages };