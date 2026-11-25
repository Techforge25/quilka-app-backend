const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache } = require("../../redis/redisHelpers");
const RevenueGeneration = require("../../models/revenueGenerationModel");
const Book = require("../../models/bookModel");
const getDateFilter = require("../../utils/dateFilter");
const TokenConsumption = require("../../models/tokenConsumptionModel");

 // Fetch business overview stats
const fetchBusinessOverviewStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateRange = "all" } = request.query;
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

// Fetch AI stats
const fetchAIStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateRange = "all" } = request.query;
    const { dateFilter } = getDateFilter(dateRange);

    // Prepare key
    const key = `dashboard:ai:stats:${dateRange}`;
    
    // Get from cache
    let aiStats = await getCache(key);
    if(!aiStats)
    {
        // Get from DB
        [aiStats] = await TokenConsumption.aggregate([
            // Match
            { $match: { ...dateFilter } },

            // Group
            {
                $group: {
                    _id: null,

                    // Input Tokens
                    inputTokensConsumed: { $sum: "$usage.promptTokens" },
                    inputTokensCost: { $sum: "$costing.inputCost" },

                    // Output Tokens
                    outputTokensConsumed: { $sum: "$usage.candidatesTokens" },
                    outputTokensCost: { $sum: "$costing.outputCost" },

                    // Image Output Tokens
                    imageOutputTokensConsumed: { $sum: "$usage.imageTokens" },
                    imageOutputTokensCost: { $sum: "$costing.imageOutputCost" },

                    // Total Tokens
                    totalTokensConsumed: { $sum: "$usage.totalTokens" },
                    totalTokensCost: { $sum: "$costing.totalCost" }
                }
            },

            // Projection
            {
                $project: {
                    _id: 0,

                    // Input Tokens
                    inputTokens: {
                        consumed: "$inputTokensConsumed",
                        cost: "$inputTokensCost"
                    },

                    // Output Tokens
                    outputTokens: {
                        consumed: "$outputTokensConsumed",
                        cost: "$outputTokensCost"
                    },

                    // Image Output Tokens
                    imageOutputTokens: {
                        consumed: "$imageOutputTokensConsumed",
                        cost: "$imageOutputTokensCost"
                    },

                    // Total Tokens
                    totalTokens: {
                        consumed: "$totalTokensConsumed",
                        cost: "$totalTokensCost"
                    }
                }
            }
        ]);
        await setCache(key, aiStats, 5);
    }

    // Response
    return response.status(200).json(new ApiResponse(200, aiStats, "AI stats have been fetched"));
});

// Fetch recent purchased books
const fetchRecentPurchasedBooks = asyncHandler(async (request, response) => {
    // Get from cache
    const key = `books:dashboard:recent`;
    let books = await getCache(key);
    if(!books)
    {
        // Get from DB
        books = await Book.aggregate([
            // Match purchased books
            { $match: { status: { $ne: "pending" } } },

            // Lookup user
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [{ $project: { fullName: 1 } }]
                }
            },

            // Lookup revenue generation for purchased amount
            {
                $lookup: {
                    from: "revenuegenerations",
                    localField: "_id",
                    foreignField: "sourceId",
                    as: "purchasedAmount",
                    pipeline: [
                        { $match: { sourceModel: "Book" } },
                        { $project: { _id: 0, revenue: 1 } }
                    ]
                }
            },            

            // Unwind
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$purchasedAmount", preserveNullAndEmptyArrays: true } },

            // Lookup token consumption
            {
                $lookup: {
                    from: "tokenconsumptions",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "tokenconsumptions",
                    pipeline: [{ $project: { totalTokens: "$usage.totalTokens", totalCost: "$costing.totalCost" } }]
                }
            },

            // Add fields
            {
                $addFields: {
                    totalTokens: { $sum: "$totalTokens" },
                    totalCost: { $sum: "$totalCost" },
                    purchasedAmount: "$purchasedAmount.revenue",
                }
            },

            // Sort
            { $sort: { createdAt: -1 } },

            // Limit
            { $limit: 10 },

            // Projection
            {
                $project: {
                    fullName: "$user.fullName",
                    title: 1,
                    createdAt: 1,
                    totalTokens: 1,
                    totalCost: 1,
                    purchasedAmount: 1,
                }
            }
        ]);
        await setCache(key, books, 10);
    }
    if(!books.length) return response.status(200).json(new ApiResponse(200, books, "No recently purchased books found"));

    // Response
    return response.status(200).json(new ApiResponse(200, books, "Recently purchased books have been fetched"));
});

module.exports = { fetchBusinessOverviewStats, fetchAIStats, fetchRecentPurchasedBooks };