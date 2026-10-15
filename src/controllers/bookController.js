const Book = require("../models/bookModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { createBookValidator } = require("../validators/bookValidator");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../utils/convertToMongoId");
const { emptyList } = require("../constants");
const llm = require("../service/llmService");
const { promptGuideForCoverImage, promptGuideForFrontImage } = require("../utils/promptGuide");
const { uploadToCloudinary } = require("../utils/cloudinary");

// Create book
const createBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { mode, title, authorName, spreadsCount, txtContent, prompt, 
    ageGroup, bookSize, spreadSize, textStyle,  illustrationStyle, 
    language, spreads } = validatePayload(createBookValidator, request.body) || {};

    // Validate custom mode
    if(mode === "CUSTOM")
    {
        // Extract total spread characters and validate
        const totalSpreadCharacters = spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);
        if(txtContent.length > totalSpreadCharacters) throw new ApiError(403, "Please increase spread limit");
    }

    // Create book
    const book = await Book.create({ 
        userId, 
        mode, 
        title, 
        authorName, 
        spreadsCount, 
        txtContent,
        prompt,
        ageGroup, 
        bookSize, 
        spreadSize,
        textStyle,
        illustrationStyle,
        language, 
        spreads
    });
    if(!book) throw new ApiError(500, "Failed to create book");

    // Response
    return response.status(201).json(new ApiResponse(201, { bookId: book._id }, "Book has been created"));
});

// Update book
const updateBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get validated payload
    const { mode, title, authorName, spreadsCount, txtContent, prompt, 
    ageGroup, bookSize, spreadSize, textStyle,  illustrationStyle, 
    language, spreads } = validatePayload(createBookValidator, request.body) || {};    

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to re-create this book");
    if(book.status !== "pending") throw new ApiError(400, "Book must be in pending state to update book details");
    
    // Update in db
    Object.assign(book, { 
        mode, title, authorName, spreadsCount, txtContent, prompt, 
        ageGroup, bookSize, spreadSize, textStyle, illustrationStyle,
        language, spreads
    });
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, { bookId: book._id }, "Book details have been updated"));
});

// Fetch my books
const fetchMyBooks = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "", status = "all" } = request.query;
    const userId = convertToMongoId(request.user._id);

    // Sanitize status key
    if(status && !["all", "draft", "published"].includes(status)) throw new ApiError(400, "Invalid book status provided");

    // Base filter
    const baseFilter = {};
    if(search) baseFilter.title = { $regex: search, $options: "i" };

    // Status filter
    if(status.toLowerCase() === "all")
    {
        baseFilter.status = { $in: ["draft", "published"] };
    }
    else
    {
        baseFilter.status = status;
    }

    // Fetch
    const books = await Book.aggregatePaginate([
        // Match
        { $match: { userId, ...baseFilter } },

        // Sort
        { $sort: { updatedAt: -1 } },

        // Projection
        {
            $project: {
                mode: 1,
                title: 1,
                authorName: 1,
                frontImage: 1,
                pages: {
                    $multiply: ["$spreadsCount", 2]
                },
                status: 1,
                draftStage: 1
            }
        }
    ], { page, limit });
    if(!books.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No books found"));

    // Response
    return response.status(200).json(new ApiResponse(200, books, "Books have been fetched"));
});

// View book
const viewBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
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
                },
                price: 26.99 // Hard coded 
            }
        },

        // Projection
        {
            $project: {
                userId: 1,
                mode: 1,
                title: 1,
                authorName: 1,
                bookLength: 1,
                ageGroup: 1,
                illustrationStyle: 1,
                language: 1,
                totalCharacters: 1,
                totalIllustrations: 1,
                price: 1
            }
        }
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to view this book");

    // Exclude property
    delete book.userId;

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book has been fetched"));
});

// View book content
const viewBookContent = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
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
                totalIllustrations: { $sum: "$spreads.illustrationLimit" },
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
                userId: 1,
                authorName: 1,
                frontImage: 1,
                title: 1,
                bookLength: 1,
                totalCharacters: 1,
                totalIllustrations: 1,
                storyContent: 1,
                status: 1,
                draftStage: 1
            }
        }
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book content not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to view this book content");

    // Exclude property
    delete book.userId;

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book content has been fetched"));
});

// Create book front and cover images
const createFrontAndCoverImages = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to generate front and cover images for this book");
    if(book.status !== "draft") throw new ApiError(400, "Front and cover images can only be generated in draft state");
    if(book.draftStage !== 3) throw new ApiError(403, "Book should be in draft stage 3 before generating front and cover images");

    // Prompt for front image
    const frontPrompt = promptGuideForFrontImage({
        bookTitle: book.title,
        content: book.mode === "CUSTOM" ? book.txtContent : book.aiContent,
        size: book.spreadSize,
        illustrationStyle: book.illustrationStyle
    });

    // Prompt for cover image
    const coverPrompt = promptGuideForCoverImage({
        authorName: book.authorName,
        content: book.mode === "CUSTOM" ? book.txtContent : book.aiContent,
        size: book.spreadSize,
        illustrationStyle: book.illustrationStyle
    });

    // LLM Response
    const llmResponse = await llm.generateFrontAndCoverImages(frontPrompt, coverPrompt, "gemini-3.1-flash-image");

    // Extract
    const { frontImageBuffer, coverImageBuffer, totalTokenCount } = llmResponse;

    // Validate
    if(!frontImageBuffer) throw new ApiError(500, "Failed to generate front image");
    if(!coverImageBuffer) throw new ApiError(500, "Failed to generate cover image");
    console.log("Total token consumption", totalTokenCount);

    // Upload to cloudinary from illustration pipeline
    const [uploadFront, uploadCover] = await Promise.all([
        uploadToCloudinary(frontImageBuffer),
        uploadToCloudinary(coverImageBuffer)
    ]);
    if(!uploadFront) throw new ApiError(500, "Failed to upload front image to cloudinary");
    if(!uploadCover) throw new ApiError(500, "Failed to upload cover image to cloudinary");

    // Get URLs
    const frontUrl = uploadFront.secure_url;
    const coverUrl = uploadCover.secure_url;

    // Save to db
    book.frontImage = frontUrl;
    book.backImage = coverUrl;
    await book.save();
    
    // Response
    return response.status(201).json(new ApiResponse(201, { frontUrl, coverUrl }, "Book front & cover images have been created"));
});

// Publish book
const publishBook = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to publish this book");
    if(book.status !== "draft") throw new ApiError(400, "Book must be in draft state before publish");
    if(book.draftStage !== 3) throw new ApiError(403, "Book must be in draft stage 3 before publish");

    // Save to db
    book.draftStage = 4;
    book.status = "published";
    await book.save();
    
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Book has been published"));
});

// Fetch front and back images
const fetchFrontAndBackImages = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId).select("userId status draftStage frontImage backImage");
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to access this book");
    if(book.status !== "draft") throw new ApiError(400, "Book must be in draft state to view front and back images");
    if(book.draftStage !== 3) throw new ApiError(403, "Book must be in draft stage 3 to view front and back images");

    // Payload
    const payload = {
        frontImage: book.frontImage,
        backImage: book.backImage
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Front and back images have been fetched"));
});

module.exports = { createBook, updateBook, fetchMyBooks, viewBook, viewBookContent, 
createFrontAndCoverImages, publishBook, fetchFrontAndBackImages };