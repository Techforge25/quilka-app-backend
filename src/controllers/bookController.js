const Book = require("../models/bookModel");
const Regeneration = require("../models/regenerationModel");
const RevenueGeneration = require("../models/revenueGenerationModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { createBookValidator } = require("../validators/bookValidator");

// Create book
const createBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { mode, title, authorName, spreadsCount, txtContent, aiContent, 
    storyContent, ageGroup, bookSize, illustrationStyle, language, spreads, 
    payment, paymentGateway, transactionId } = validatePayload(createBookValidator, request.body) || {};

    // Create book
    const book = await Book.create({ 
        userId, 
        mode, 
        title, 
        authorName, 
        spreadsCount, 
        txtContent,
        aiContent, 
        storyContent, 
        ageGroup, 
        bookSize, 
        illustrationStyle,
        language, 
        spreads
    });
    if(!book) throw new ApiError(500, "Failed to create book");

    // Create revenue generation
    const revenueGeneration = await RevenueGeneration.create({
        userId, 
        sourceId: book._id,
        sourceModel: "Book",
        revenue: payment,
        paymentGateway,
        transactionId,
        status: "paid"
    });
    if(!revenueGeneration) throw new ApiError(500, "Failed to create payment data");

    // Add 5 free regeneration for this book
    const regeneration = await Regeneration.create({ userId, bookId: book._id, limit: 5 });
    if(!regeneration) throw new ApiError(500, "Failed to add 5 free regenerations");

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Book has been published"));
});

module.exports = { createBook };