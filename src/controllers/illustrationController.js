const { isValidObjectId } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { promptGuideForIllustration } = require("../utils/promptGuide");
const { uploadToCloudinary } = require("../utils/cloudinary");
const llm = require("../service/llmService");
const Book = require("../models/bookModel");

// Create illustration
const createIllustration = asyncHandler(async (request, response) => {
    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Find spread
    const spread = book.spreads.id(spreadId);
    if(!spread) throw new ApiError(404, "Spread not found");

    // Validate
    if(book.status !== "draft") throw new ApiError(403, "The illustration generation with AI cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be created in draft stage 2");

    // Generate illustration
    const illustrationResponse = await llm.generateStoryIllustration(promptGuideForIllustration(), "gemini-3.1-flash-image");
    if(!illustrationResponse) throw new ApiError(400, "Failed to generate illustration! Please write appropriate prompt.");

    // Extract generated image buffer and token consumption count
    const { imageBuffer, totalTokenCount } = illustrationResponse;
    console.log("Total Token", totalTokenCount);

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Grab the production-ready secure public URL
    const cloudinaryUrl = uploadResult.secure_url;

    // Save illustration to specific spread
    spread.illustrationURL = cloudinaryUrl;
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, { illustration: cloudinaryUrl }, "Illustration has been created"));
});

module.exports = { createIllustration };