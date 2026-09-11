const Book = require("../models/bookModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { createBookValidator } = require("../validators/bookValidator");

// Create book
const createBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { mode, title, authorName, spreadsCount, txtContent, 
    aiContent, storyContent, ageGroup, bookSize, illustrationStyle, 
    language, spreads } = validatePayload(createBookValidator, request.body) || {};

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

    // Response
    return response.status(201).json(new ApiResponse(201, { bookId: book._id }, "Book has been created"));
});

module.exports = { createBook };