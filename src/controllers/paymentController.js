const Book = require("../models/bookModel");
const Regeneration = require("../models/regenerationModel");
const RevenueGeneration = require("../models/revenueGenerationModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { isValidObjectId } = require("mongoose");
const { payForBookValidator, payForRegenerationValidator } = require("../validators/paymentValidator");
const Package = require("../models/packageModel");
const { deleteCacheByPattern } = require("../redis/redisHelpers");

// Pay for book
const payForBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { price, paymentGateway, transactionId } = validatePayload(payForBookValidator, request.body) || {};

    // Find book
    const book = await Book.findById(bookId).select("userId status draftStage");

    // Validate edge cases
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to access this book.");
    if(book.status !== "pending") throw new ApiError(403, "Forbidden! Payment has already been processed for this book");

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

    // Mark book status as draft
    book.status = "draft";
    book.draftStage = 1;
    await book.save();
    await deleteCacheByPattern(`books:${bookId}*`);

    // Add 5 free regeneration to this book
    const regeneration = await Regeneration.create({ userId, bookId, limit: 5 });
    if(!regeneration) throw new ApiError(500, "Failed to add 5 free regenerations");
    
    // Response
    return response.status(200).json(new ApiResponse(200, bookId, "Payment has been completed"));
});

// Pay for regenerations
const payForRegeneration = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { bookId } = request.params;

    // Sanitize payload
    const { packageId, price, paymentGateway, transactionId } = validatePayload(payForRegenerationValidator, request.body) || {};    

    // Sanitize IDs
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(packageId)) throw new ApiError(400, "Invalid Package ID");

    // Find book and package
    const [book, package] = await Promise.all([
        Book.findById(bookId).select("userId status draftStage"),
        Package.findById(packageId).select("price credits").lean()
    ]);

    // Validate edge cases
    if(!book) throw new ApiError(404, "Book not found");
    if(!package) throw new ApiError(404, "Package not found");
    if(price !== Number(package.price)) throw new ApiError(400, "Price mismatch!");  
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to purchase regenerations for this book");
    if(book.status === "published") throw new ApiError(403, "Forbidden! You cannot purchase regenerations for published book");  

    // Execute parallel
    const [revenueGeneration, regeneration] = await Promise.all([
        // Save to revenue generation
        RevenueGeneration.create({
            userId,
            revenue: price,
            sourceId: packageId,
            sourceModel: "Regeneration",
            paymentGateway,
            transactionId,
            status: "paid"
        }),

        // Update regenerations
        Regeneration.findOneAndUpdate(
            { userId, bookId },
            { $inc: { limit: Number(package.credits) } }
        )
    ]);
    if(!revenueGeneration) throw new ApiError(500, "Failed to save record in revenue generation");
    if(!regeneration) throw new ApiError(500, "Failed to update regenerations");
    await deleteCacheByPattern(`books:${bookId}*`);
    
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Payment has been completed"));
});

module.exports = { payForBook, payForRegeneration };