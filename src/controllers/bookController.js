const Book = require("../models/bookModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { createBookValidator } = require("../validators/bookValidator");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../utils/convertToMongoId");
const { emptyList } = require("../constants");

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

// Fetch my books
const fetchMyBooks = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;
    const userId = convertToMongoId(request.user._id);

    // Fetch
    const books = await Book.aggregatePaginate([
        // Match
        { $match: { userId, status: "published" } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                title: 1,
                authorName: 1,
                frontImage: 1,
                pages: {
                    $multiply: ["$spreadsCount", 2]
                }
            }
        }
    ], { page, limit });
    if(!books.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No books found"));

    // Response
    return response.status(200).json(new ApiResponse(200, books, "Books have been fetched"));
});

// View book
const viewBook = asyncHandler(async (request, response) => {
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Fetch
    const [book] = await Book.aggregate([
        // Match
        { $match: { _id: convertToMongoId(bookId) } },

        // Add fields to calculate characters, illustrations and book length
        {
            $addFields: {
                totalCharacters: { $sum: "$spreads.characterLimit" },
                totalIllustrations: { $sum: "$spreads.illustrationLimit" },
                bookLength: {
                    spreads: "$spreadsCount",
                    pages: { $multiply: ["$spreadsCount", 2] },
                }
            }
        },

        // Projection
        {
            $project: {
                title: 1,
                authorName: 1,
                bookLength: 1,
                ageGroup: 1,
                illustrationStyle: 1,
                language: 1,
                totalCharacters: 1,
                totalIllustrations: 1               
            }
        }
    ]);
    if(!book) throw new ApiError(404, "Book not found");

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book has been fetched"));
});

// View book content
const viewBookContent = asyncHandler(async (request, response) => {
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Fetch
    const [book] = await Book.aggregate([
        // Match
        { $match: { _id: convertToMongoId(bookId) } },

        // Add fields to calculate characters, book length
        {
            $addFields: {
                totalCharacters: { $sum: "$spreads.characterLimit" },
                bookLength: {
                    spreads: "$spreadsCount",
                    pages: { $multiply: ["$spreadsCount", 2] },
                },
                storyContent: {
                    $cond: [
                        { $eq: ["$mode", "CUSTOM"] },
                        "$txtContent",
                        "$aiContent"
                    ]
                }
            }
        },

        // Projection
        {
            $project: {
                title: 1,
                bookLength: 1,
                totalCharacters: 1,
                storyContent: 1
            }
        }
    ]);
    if(!book) throw new ApiError(404, "Book content not found");

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book content has been fetched"));
});

module.exports = { createBook, fetchMyBooks, viewBook, viewBookContent };