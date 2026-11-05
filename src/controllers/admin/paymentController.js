const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache } = require("../../redis/redisHelpers");
const { emptyList } = require("../../constants");
const RevenueGeneration = require("../../models/revenueGenerationModel");

// Fetch stats
const fetchPaymentStats = asyncHandler(async (request, response) => {
    // Key
    const key = `payments:netRevenue`;

    // Get from cache
    let netRevenue = await getCache(key);
    if(!netRevenue)
    {
        // Get from db
        [[netRevenue]] = await Promise.all([
            RevenueGeneration.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$revenue" }
                    }
                }
            ])
        ]);

        // Set in cache
        await setCache(key, netRevenue, 60);
    }

    // Payload
    const payload = {
        netRevenue: Number(netRevenue.totalRevenue) || 0
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Payment stats have been fetched"));
});

// Fetch payments
const fetchPayments = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get from cache
    const key = `payments:page:${page}:limit:${limit}`;
    let payments = await getCache(key);
    if(!payments)
    {
        // Get from db
        payments = await RevenueGeneration.aggregatePaginate([
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

            // Lookup book
            {
                $lookup: {
                    from: "books",
                    localField: "sourceId",
                    foreignField: "_id",
                    as: "book",
                    pipeline: [{ $project: { title: 1 } }]
                }
            },
            
            // Lookup regenerations
            {
                $lookup: {
                    from: "regenerations",
                    localField: "sourceId",
                    foreignField: "_id",
                    as: "regeneration",
                    pipeline: [
                        {
                            $lookup: {
                                from: "packages",
                                localField: "packageId",
                                foreignField: "_id",
                                as: "package",
                                pipeline: [{ $project: { name: 1 } }]
                            }
                        },

                        // Unwind package
                        { $unwind: { path: "$regeneration.package", preserveNullAndEmptyArrays: true } }               
                    ]
                }
            },

            // Unwind
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$regeneration", preserveNullAndEmptyArrays: true } },

            // Add source name conditionally
            {
                $addFields: {
                    sourceName: {
                        $cond: [
                            { $eq: ["$sourceModel", "Book"] },
                            "$book.title",
                            "$regeneration.package.name"
                        ]
                    }
                }
            },

            // Sort
            { $sort: { createdAt: -1 } },

            // Projection
            {
                $project: {
                    user: "$user.fullName",
                    sourceName: 1,
                    transactionId: 1,
                    sourceType: "$sourceModel",
                    amount: "$revenue",
                    provider: "$paymentGateway"
                }
            }
        ], { page, limit });

        // Set in cache
        await setCache(key, payments, 60);
    }
    if(!payments.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No payment details found"));

    // Response
    return response.status(200).json(new ApiResponse(200, payments, "Payment details have been fetched"));
});

module.exports = { fetchPaymentStats, fetchPayments };