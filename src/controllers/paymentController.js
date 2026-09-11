const Book = require("../models/bookModel");
const Regeneration = require("../models/regenerationModel");
const RevenueGeneration = require("../models/revenueGenerationModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { isValidObjectId } = require("mongoose");
const { payForBookValidator } = require("../validators/paymentValidator");

// Pay for book
const payForBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { price, paymentGateway, transactionId } = validatePayload(payForBookValidator, request.body) || {};

    // Find book
    const book = await Book.findById(bookId).select("userId status");

    // Validate edge cases
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to access this book.");
    if(book.status === "published") throw new ApiError(403, "Forbidden! Payment has already been processed for this book");

    // Save to revenue generation
    const revenueGeneration = await RevenueGeneration.create({ 
        userId,
        revenue: price,
        sourceId: bookId,
        sourceModel: "Book",
        paymentGateway,
        transactionId,
        status: "paid"
    });
    if(!revenueGeneration) throw new ApiError(500, "Failed to save record in revenue generation");

    // Add 5 free regeneration to this book
    const regeneration = await Regeneration.create({ userId, bookId, limit: 5 });
    if(!regeneration) throw new ApiError(500, "Failed to add 5 free regenerations");
    
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Payment has been completed"));
});

module.exports = { payForBook };