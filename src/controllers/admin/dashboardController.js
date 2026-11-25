const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache, deleteCacheByPattern } = require("../../redis/redisHelpers");
const { emptyList } = require("../../constants");
const RevenueGeneration = require("../../models/revenueGenerationModel");
const Book = require("../../models/bookModel");
const getDateFilter = require("../../utils/dateFilter");

 // Fetch business overview stats
const fetchBusinessOverviewStats = asyncHandler(async (request, response) => {
    const { dateRange = "all" } = request.query;
    
    // Get date filter
    const { dateFilter } = getDateFilter(dateRange);

    // Prepare keys
    const revenueKey = `dashboard:overview:stats:revenue:${dateRange}`;
    const bookKey = `dashboard:overview:stats:books:${dateRange}`;

    // Get from cache
    let revenue = await getCache(revenueKey);
    if(!revenue)
    {
        // Fetch from DB
        [revenue] = await RevenueGeneration.aggregate([
            // Match paid transactions
            { $match: { ...dateFilter, status: "paid" } },

            // Group revenue
            {
                $group: {
                    _id: null,

                    // Revenue from Book Purchases
                    revenueFromBookPurchases: {
                        $sum: {
                            $cond: [
                                { $eq: ["$sourceModel", "Book"] },
                                "$revenue",
                                0
                            ]
                        }
                    },

                    // Revenue from Regenerations
                    revenueFromRegenerations: {
                        $sum: {
                            $cond: [
                                { $eq: ["$sourceModel", "Regeneration"] },
                                "$revenue",
                                0
                            ]
                        }
                    }
                }
            },

            // Add total revenue
            {
                $addFields: {
                    totalRevenue: { 
                        $add: ["$revenueFromBookPurchases", "$revenueFromRegenerations"]
                    }
                }
            },

            // Projection
            {
                $project: {
                    _id: 0,
                    revenueFromBookPurchases: 1,
                    revenueFromRegenerations: 1,
                    totalRevenue: 1
                }
            }
        ]);

        // Set in redis
        await setCache(revenueKey, revenue, 5);
    }

    // Get from cache
    let totalBooksCreated = await getCache(bookKey);
    if(!totalBooksCreated)
    {
        // Get from DB
        totalBooksCreated = await Book.countDocuments({ ...dateFilter });
        await setCache(bookKey, totalBooksCreated, 5);
    }
    

    // Payload
    const payload = {
        revenueFromBookPurchases: revenue?.revenueFromBookPurchases || 0,
        revenueFromRegenerations: revenue?.revenueFromRegenerations || 0,
        totalRevenue: revenue?.totalRevenue || 0,
        totalBooksCreated
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Business overview stats have been fetched"));
});


module.exports = { fetchBusinessOverviewStats };