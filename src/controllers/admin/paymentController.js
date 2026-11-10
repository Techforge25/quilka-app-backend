const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache } = require("../../redis/redisHelpers");
const { emptyList } = require("../../constants");
const RevenueGeneration = require("../../models/revenueGenerationModel");
const getDateFilter = require("../../utils/dateFilter");

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
    const { page = 1, limit = 10, search = "", dateRange = "all" } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(dateRange);

    // Get from cache
    const key = `payments:page:${page}:limit:${limit}:search:${String(search).toLowerCase()}:dateRange:${dateRange}`;
    let payments = await getCache(key);
    if(!payments)
    {
        // Get from db
        payments = await RevenueGeneration.aggregatePaginate([
            // Match
            { $match: dateFilter },

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

            // Lookup regeneration
            {
                $lookup: {
                    from: "regenerations",
                    localField: "sourceId",
                    foreignField: "_id",
                    as: "regeneration",
                    pipeline: [{ $project: { bookId: 1 } }]
                }
            },

            // Unwind
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$regeneration", preserveNullAndEmptyArrays: true } },

            // Match by user full name
            ...(search ? [
                { $match: { "user.fullName": { $regex: String(search).toLowerCase(), $options: "i" } } }
            ] : []),       

            // Add book id conditionally
            {
                $addFields: {
                    bookId: {
                        $cond: [
                            { $eq: ["$sourceModel", "Book"] },
                            "$sourceId",
                            "$regeneration.bookId"
                        ]
                    }
                }
            },

            // Lookup book
            {
                $lookup: {
                    from: "books",
                    localField: "bookId",
                    foreignField: "_id",
                    as: "book",
                    pipeline: [{ $project: { title: 1 } }]
                }
            },

            // Unwind book
            { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },      

            // Sort
            { $sort: { createdAt: -1 } },

            // Projection
            {
                $project: {
                    user: "$user.fullName",
                    book: "$book.title",
                    transactionId: 1,
                    sourceType: "$sourceModel",
                    amount: "$revenue",
                    provider: "$paymentGateway"
                }
            }
        ], { page, limit, useFacet: false });

        // Set in cache
        await setCache(key, payments, 60);
    }
    if(!payments.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No payment details found"));

    // Response
    return response.status(200).json(new ApiResponse(200, payments, "Payment details have been fetched"));
});

module.exports = { fetchPaymentStats, fetchPayments };