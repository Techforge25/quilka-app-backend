const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache } = require("../../redis/redisHelpers");
const { emptyList } = require("../../constants");
const User = require("../../models/userModel");
const getDateFilter = require("../../utils/dateFilter");
const { isValidObjectId } = require("mongoose");
const ApiError = require("../../utils/ApiError");
const convertToMongoId = require("../../utils/convertToMongoId");
const Book = require("../../models/bookModel");
const { getNotFoundKey } = require("../../utils/redisKeys");
const { markNotFoundCache } = require("../../utils/markNotFoundCache");
const { redis } = require("../../redis/connection");

// Fetch users
const fetchUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "", status, dateRange = "all" } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(dateRange);

    // Get from cache
    const key = `users:page:${page}:limit:${limit}:search:${String(search).toLowerCase()}:status:${status}:dateRange:${dateRange}`;
    let users = await getCache(key);
    if(!users)
    {
        // Base filter
        const baseFilter = {};
        if(status && !["pending", "active", "suspended"].includes(status)) throw new ApiError(400, "Invalid status filter");
        if(status) baseFilter.status = status;

        // Get from db
        users = await User.aggregatePaginate([
            // Match
            { $match: { ...baseFilter, ...dateFilter } },

            // Match by user full name
            ...(search ? [
                { $match: { fullName: { $regex: String(search).toLowerCase(), $options: "i" } } }
            ] : []),

            // Lookup book
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "userId",
                    as: "books",
                    pipeline: [{ $project: { title: 1 } }]
                }
            },

            // Lookup revenue generations
            {
                $lookup: {
                    from: "revenuegenerations",
                    localField: "_id",
                    foreignField: "userId",
                    as: "revenuegenerations",
                    pipeline: [{ $project: { revenue: 1 } }]
                }
            },            

            // Sort
            { $sort: { createdAt: -1 } },

            // Projection
            {
                $project: {
                    fullName: 1,
                    email: 1,
                    createdAt: 1,
                    totalBooks: { $size: "$books" },
                    totalSpend: { $sum: "$revenuegenerations.revenue" },
                    status: 1,
                }
            }
        ], { page, limit });

        // Set in cache
        await setCache(key, users, 60);
    }
    if(!users.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No user details found"));

    // Response
    return response.status(200).json(new ApiResponse(200, users, "Users have been fetched"));
});

// Fetch user stats
const fetchUserStats = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { userId } = request.params;
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");

    // Get from cache
    const key = `users:${userId}:stats`;
    let user = await getCache(key);
    if(!user)
    {
        // Track not found attempts
        const notFoundKey = getNotFoundKey(request);
        await markNotFoundCache(notFoundKey);

        // Get from DB
        [user] = await User.aggregate([
            // Match
            { $match: { _id: convertToMongoId(userId) } },

            // Lookup book for total books computation
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "userId",
                    as: "books",
                    pipeline: [{ $project: { title: 1 } }]
                }
            },

            // Lookup revenue generations for total cost spending computation
            {
                $lookup: {
                    from: "revenuegenerations",
                    localField: "_id",
                    foreignField: "userId",
                    as: "revenuegenerations",
                    pipeline: [{ $project: { revenue: 1 } }]
                }
            },

            // Lookup token consumption for computing token counts
            {
                $lookup: {
                    from: "tokenconsumptions",
                    localField: "_id",
                    foreignField: "userId",
                    as: "tokenconsumptions",
                    pipeline: [{ $project: { totalTokens: "$usage.totalTokens" } }]
                }
            },

            // Lookup regenerations for computing total used regenerations
            {
                $lookup: {
                    from: "regenerations",
                    localField: "_id",
                    foreignField: "userId",
                    as: "regenerations",
                    pipeline: [{ $project: { used: 1 } }]
                }
            },

            // Add total books, total spend and token consumed fields
            {
                $addFields: {
                    totalBooks: { $size: "$books" },
                    totalSpend: { $sum: "$revenuegenerations.revenue" },
                    tokensConsumed: { $sum: "$tokenconsumptions.totalTokens" },
                    regenerationsUsed: { $sum: "$regenerations.used" }
                }
            },

            // Projection
            {
                $project: {
                    _id: 0,
                    fullName: 1,
                    email: 1,
                    createdAt: 1,
                    status: 1,
                    totalBooks: 1,
                    totalSpend: 1,
                    tokensConsumed: 1,
                    regenerationsUsed: 1
                }
            }
        ]);        
        if(!user)
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "User not found");
        }

        // Set in cache
        await setCache(key, user, 60);
    }

    // Response
    return response.status(200).json(new ApiResponse(200, user, "User stats have been fetched"));
});

// Fetch user books
const fetchUserBooks = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Sanitize ID
    const { userId } = request.params;
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");

    // Get from cache
    const key = `users:${userId}:books:page:${page}:limit:${limit}`;
    let books = await getCache(key);
    if(!books)
    {
        // Get from DB
        books = await Book.aggregatePaginate([
            // Match
            { $match: { userId: convertToMongoId(userId) } },

            // Lookup revenue generation for book price
            {
                $lookup: {
                    from: "revenuegenerations",
                    localField: "_id",
                    foreignField: "sourceId",
                    as: "revenuegenerations",
                    pipeline: [
                        { $match: { userId: convertToMongoId(userId), sourceModel: "Book" } },
                        { $project: { revenue: 1 } }
                    ]
                }
            },

            // Unwind
            { $unwind: { path: "$revenuegenerations", preserveNullAndEmptyArrays: true } },

            // Sort
            { $sort: { createdAt: -1 } },

            // Projection
            {
                $project: {
                    title: 1,
                    bookSize: 1,
                    spreadsCount: 1,
                    createdAt: 1,
                    price: "$revenuegenerations.revenue",
                    status: 1
                }
            }
        ], { page, limit });

        // Set in cache
        await setCache(key, books, 60);
    }
    if(!books.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No books found"));

    // Response
    return response.status(200).json(new ApiResponse(200, books, "User books have been fetched"));
});

module.exports = { fetchUsers, fetchUserStats, fetchUserBooks };