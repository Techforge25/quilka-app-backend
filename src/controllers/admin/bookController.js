const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache } = require("../../redis/redisHelpers");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");
const Book = require("../../models/bookModel");
const { getNotFoundKey } = require("../../utils/redisKeys");
const { markNotFoundCache } = require("../../utils/markNotFoundCache");
const { redis } = require("../../redis/connection");
const TokenConsumption = require("../../models/tokenConsumptionModel");
const { emptyList } = require("../../constants");
const RevenueGeneration = require("../../models/revenueGenerationModel");

// Fetch book stats
const fetchBookStats = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get from cache
    const key = `books:${bookId}:stats`;
    let book = await getCache(key);
    if(!book)
    {
        // Track not found attempts
        const notFoundKey = getNotFoundKey(request);
        await markNotFoundCache(notFoundKey);

        // Get from DB
        [book] = await Book.aggregate([
            // Match
            { $match: { _id: convertToMongoId(bookId) } },

            // Lookup revenue generation
            {
                $lookup: {
                    from: "revenuegenerations",
                    localField: "_id",
                    foreignField: "sourceId",
                    as: "bookPrice",
                    pipeline:[
                        { $match: { sourceModel: "Book" } },
                        { $project: { revenue: 1 } }
                    ]
                }
            },

            // Lookup token consumption
            {
                $lookup: {
                    from: "tokenconsumptions",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "tokenconsumptions",
                    pipeline: [{ $project: { totalTokens: 1 } }]
                }
            },

            // Lookup regenerations
            {
                $lookup: {
                    from: "regenerations",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "regeneration",
                    pipeline: [{ $project: { limit: 1, used: 1 } }]
                }
            },            

            // Unwind
            { $unwind: { path: "$bookPrice", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$regeneration", preserveNullAndEmptyArrays: true } },

            // Projection
            {
                $project: {
                    _id: 0,
                    title: 1,
                    authorName: 1,
                    createdAt: 1,
                    status: 1,
                    bookPrice: "$bookPrice.revenue",
                    tokensConsumed: { $sum: "$tokenconsumptions.totalTokens" },
                    regenerationsUsed: "$regeneration.used",
                    remainingCredits: "$regeneration.limit"
                }
            }
        ]);
        if(!book) 
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Book not found");
        }

        // Set in cache
        await setCache(key, book, 60);
    }

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book stats have been fetched"));
});

// Fetch book overview
const fetchBookOverview = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get from cache
    const key = `books:${bookId}:overview`;
    let book = await getCache(key);
    if(!book)
    {
        // Track not found attempts
        const notFoundKey = getNotFoundKey(request);
        await markNotFoundCache(notFoundKey);

        // Get from DB
        [book] = await Book.aggregate([
            // Match
            { $match: { _id: convertToMongoId(bookId) } },

            // Lookup spreads
            {
                $lookup: {
                    from: "spreads",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "spreads",
                    pipeline: [{ $project: { _id: 1 } }]
                }
            },

            // Add fields
            {
                $addFields: {
                    totalSpreads: { $size: "$spreads" },
                }
            },

            // Projection
            {
                $project: {
                    _id: 0,
                    bookSize: 1,
                    illustrationStyle: 1,
                    language: 1,
                    totalSpreads: 1,
                    totalPages: { $multiply: ["$totalSpreads", 2] }
                }
            }
        ]);
        if(!book) 
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Book not found");
        }

        // Set in cache
        await setCache(key, book, 60);
    }

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book overview has been fetched"));
});

// Fetch book overview
const fetchBookStory = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get from cache
    const key = `books:${bookId}:story`;
    let book = await getCache(key);
    if(!book)
    {
        // Track not found attempts
        const notFoundKey = getNotFoundKey(request);
        await markNotFoundCache(notFoundKey);

        // Get from DB
        [book] = await Book.aggregate([
            // Match
            { $match: { _id: convertToMongoId(bookId) } },

            // Lookup spreads
            {
                $lookup: {
                    from: "spreads",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "spreads",
                    pipeline: [{ $project: { _id: 0, mainLayoutName: 1, content: 1 } }]
                }
            },

            // Projection
            {
                $project: {
                    _id: 0,
                    frontImage: 1,
                    spreads: 1
                }
            }
        ]);
        if(!book) 
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Book not found");
        }

        // Set in cache
        await setCache(key, book, 60);
    }

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book story has been fetched"));
});

// Fetch book AI usage
const fetchBookAIUsage = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get from cache
    const key = `books:${bookId}:AIusage:page:${page}:limit:${limit}`;
    let aiUsage = await getCache(key);
    if(!aiUsage)
    {
        // Get from DB
        aiUsage = await TokenConsumption.aggregatePaginate([
            // Match
            { $match: { bookId: convertToMongoId(bookId) } },

            // Projection
            {
                $project: {
                    _id: 0,
                    type: 1,
                    tokensConsumption: "$totalTokens",
                    createdAt: 1
                }
            }
        ], { page, limit });
        await setCache(key, aiUsage, 60);
    }
    if(!aiUsage.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No AI usage found for this book"));

    // Response
    return response.status(200).json(new ApiResponse(200, aiUsage, "Book AI usage has been fetched"));
});

// Fetch book payment details
const fetchBookPaymentDetails = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get from cache
    const key = `books:${bookId}:payment`;
    let payment = await getCache(key);
    if(!payment)
    {
        // Track not found attempts
        const notFoundKey = getNotFoundKey(request);
        await markNotFoundCache(notFoundKey);

        // Get from DB
        [payment] = await RevenueGeneration.aggregate([
            // Match
            { $match: { sourceId: convertToMongoId(bookId), sourceModel: "Book" } },

            // Projection
            {
                $project: {
                    _id: 0,
                    transactionId: 1,
                    paymentGateway: 1,
                    price: "$revenue",
                    status: 1,
                }
            }
        ]);
        if(!payment)
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Payment details not found");
        }

        // Set in cache
        await setCache(key, payment, 60);
    }

    // Response
    return response.status(200).json(new ApiResponse(200, payment, "Book payment details have been fetched"));
});

module.exports = { fetchBookStats, fetchBookOverview, fetchBookStory, fetchBookAIUsage, fetchBookPaymentDetails };