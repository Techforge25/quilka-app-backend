const Book = require("../models/bookModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { createBookValidator, uploadManualFrontOrCoverImageValidator } = require("../validators/bookValidator");
const { isValidObjectId, startSession } = require("mongoose");
const convertToMongoId = require("../utils/convertToMongoId");
const { emptyList } = require("../constants");
const llm = require("../service/llmService");
const { promptGuideForCoverImage, promptGuideForFrontImage } = require("../utils/promptGuide");
const { uploadToCloudinary } = require("../utils/cloudinary");
const Spread = require("../models/spreadModel");
const Regeneration = require("../models/regenerationModel");
const { customPromptValidatorForFrontAndCover } = require("../validators/illustrationValidator");
const { getCache, setCache, deleteCacheByPattern } = require("../redis/redisHelpers");
const { redis } = require("../redis/connection");

// Create book in custom
const createBookInCustom = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Get validated payload
    const { mode, title, authorName, spreadsCount, ageGroup, bookSize, spreadSize, 
    textStyle, illustrationStyle, language, spreads } = validatePayload(createBookValidator, request.body) || {};

    // Pass to AI
    if(mode === "AI")
    {
        return next();
    }

    // Validate spreads config (Content must not be empty)
    spreads.forEach((spread, index) => {
        const spreadNo = index + 1;
        if(!spread.content) throw new ApiError(400, `Spread ${spreadNo} content is missing`);
        if(spread.content.length < 3) throw new ApiError(400, `Content length must not be less than 3 for Spread ${spreadNo}`);
        if(spread.content.length > spread.characterLimit) throw new ApiError(400, `Character limit exceeded for Spread ${spreadNo}`);
    });

    // Create book
    const book = await Book.create({ 
        userId, 
        mode, 
        title, 
        authorName, 
        spreadsCount,
        ageGroup, 
        bookSize, 
        spreadSize,
        textStyle,
        illustrationStyle,
        language, 
    });
    if(!book) throw new ApiError(500, "Failed to create book");

    // Map Book ID
    const spreadConfig = spreads.map((spread) => ({ ...spread, bookId: book._id }));

    // Create spreads
    const spread = await Spread.insertMany(spreadConfig);
    if(!spread) throw new ApiError(400, "Failed to create spreads");

    // Response
    return response.status(201).json(new ApiResponse(201, { bookId: book._id }, "Book has been created in Custom Mode!"));
});

// Create book in AI
const createBookInAI = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { mode, title, authorName, prompt, spreadsCount, ageGroup, bookSize, spreadSize, 
    textStyle, illustrationStyle, language, spreads } = validatePayload(createBookValidator, request.body) || {};

    // Validate spreads config (Content must be empty)
    spreads.forEach((spread, index) => {
        const spreadNo = index + 1;
        if(spread.content !== null) throw new ApiError(400, `Spread ${spreadNo} content must be null in AI Mode`);
    });

    // Create book
    const book = await Book.create({
        userId, 
        mode, 
        title, 
        authorName, 
        prompt,
        spreadsCount,
        ageGroup, 
        bookSize, 
        spreadSize,
        textStyle,
        illustrationStyle,
        language,
    });
    if(!book) throw new ApiError(500, "Failed to create book");

    // Map Book ID
    const spreadConfig = spreads.map((spread) => ({ ...spread, bookId: book._id }));

    // Create spreads
    const spread = await Spread.insertMany(spreadConfig);
    if(!spread) throw new ApiError(400, "Failed to create spreads");    

    // Response
    return response.status(201).json(new ApiResponse(201, { bookId: book._id }, "Book has been created in AI Mode!"));
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

    // Get from cache
    const key = `books:${userId}:page:${page}:limit:${limit}:search:${search.toLowerCase()}:status:${status}`;
    let books = await getCache(key);
    if(!books)
    {
        // Get from DB
        books = await Book.aggregatePaginate([
            // Match
            { $match: { userId, ...baseFilter } },

            // Lookup spreads
            {
                $lookup: {
                    from: "spreads",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "spreads",
                    pipeline: [{ $project: { _id: 0, content: 1 } }]
                }
            },

            // Add fields
            {
                $addFields: {
                    hasStoryGenerated: {
                        $anyElementTrue: {
                            $map: {
                                input: "$spreads",
                                as: "spread",
                                in: {
                                    $and: [
                                        { $ne: ["$$spread.content", null] },
                                        { $ne: ["$$spread.content", ""] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },

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
                    draftStage: 1,
                    hasStoryGenerated: 1
                }
            }
        ], { page, limit });
        await setCache(key, books, 1);
    }

    // Validate
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

    // Get book from cache
    const key = `books:${bookId}:viewBook`;
    let book = await getCache(key);
    if(!book)
    {
        // Track not found attempts
        const ip = request.headers["x-real-ip"] || request.ip;
        const notFoundKey = `NotFound:${ip.replaceAll(":", "-")}`;
        const attempts = await getCache(notFoundKey);
        if(attempts >= 3) throw new ApiError(429, "Too many requests for non-existing data");

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
                    as: "spreads"
                }
            },

            // Add fields to calculate characters, illustrations and book length
            {
                $addFields: {
                    totalCharacters: { $sum: "$spreads.characterLimit" },
                    totalIllustrations: { $sum: "$spreads.illustrationLimit" },
                    bookLength: {
                        spreads: "$spreadsCount",
                        pages: { $multiply: ["$spreadsCount", 2] },
                    },
                    price: { $multiply: ["$spreadsCount", 2] }
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
        if(!book)
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Book not found");
        }
        await setCache(key, book, 20);
    }

    // Authorization check
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

    // Get from cache
    const key = `books:${bookId}:viewBookContent`;
    let book = await getCache(key);
    if(!book)
    {
        // Track not found attempts
        const ip = request.headers["x-real-ip"] || request.ip;
        const notFoundKey = `NotFound:${ip.replaceAll(":", "-")}`;
        const attempts = await getCache(notFoundKey);
        if(attempts >= 3) throw new ApiError(429, "Too many requests for non-existing data");

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
                    pipeline: [{ $project: { content: 1, characterLimit: 1, illustrationLimit: 1 } }]
                }
            },

            // Lookup regenerations
            {
                $lookup: {
                    from: "regenerations",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "regeneration"
                }
            },
            
            // Unwind
            { $unwind: { path: "$regeneration", preserveNullAndEmptyArrays: true } },

            // Add fields to calculate characters, book length
            {
                $addFields: {
                    totalCharacters: { $sum: "$spreads.characterLimit" },
                    totalIllustrations: { $sum: "$spreads.illustrationLimit" },
                    bookLength: {
                        spreads: "$spreadsCount",
                        pages: { $multiply: ["$spreadsCount", 2] },
                    },
                    regenerations: "$regeneration.limit"
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
                    status: 1,
                    draftStage: 1,
                    spreads: { content: 1, characterLimit: 1 },
                    regenerations: 1
                }
            }
        ]);
        if(!book)
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Book content not found");
        }
        await setCache(key, book, 20);
    }

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to view this book content");

    // Exclude property
    delete book.userId;

    // Response
    return response.status(200).json(new ApiResponse(200, book, "Book content has been fetched"));
});

// Create book front and cover images
const createFrontAndCoverImages = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book and spreads
    const [book, spreads] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId }).select("-_id content illustrationURL base64Image")
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    // if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to generate front and cover images for this book");
    // if(book.status !== "draft") throw new ApiError(400, "Front and cover images can only be generated in draft state");
    // if(book.draftStage !== 3) throw new ApiError(403, "Book should be in draft stage 3 before generating front and cover images");

    // Story content
    const storyContent = spreads.map(spread => spread.content.trim()).join(" ");

    // Get previous images chunks as a reference
    const previousReferenceImages = spreads.filter(spread => spread.base64Image).map(spread => spread.base64Image);

    // Pass control to regenerate front and cover image controller
    if(book.frontImage || book.backImage)
    {
        request.payload = { book, storyContent, previousReferenceImages };
        return next();
    }

    // Prompt for front image
    const frontPrompt = promptGuideForFrontImage({
        bookTitle: book.title,
        content: storyContent,
        size: book.spreadSize,
        illustrationStyle: book.illustrationStyle
    });

    // Prompt for cover image
    const coverPrompt = promptGuideForCoverImage({
        authorName: book.authorName,
        content: storyContent,
        size: book.spreadSize,
        illustrationStyle: book.illustrationStyle
    });

    // LLM Response
    const llmResponse = await llm.generateFrontAndCoverImages(frontPrompt, coverPrompt, "gemini-3.1-flash-image", previousReferenceImages);
    const { frontImageBuffer, coverImageBuffer } = llmResponse;

    // Validate
    if(!frontImageBuffer) throw new ApiError(500, "Failed to generate front image");
    if(!coverImageBuffer) throw new ApiError(500, "Failed to generate cover image");

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
    await deleteCacheByPattern(`books:${bookId}*`);
    
    // Response
    return response.status(201).json(new ApiResponse(201, { frontUrl, coverUrl }, "Book front & cover images have been generated"));
});

// Regenerate front & cover images
const regenerateFrontAndCoverImages = asyncHandler(async (request, response) => {
    // Get metadata
    const userId = request.user._id;
    const { bookId } = request.params;    
    const { book, storyContent, previousReferenceImages } = request.payload;

    // Find regenerations
    const regeneration = await Regeneration.findOne({ userId, bookId });
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You've reached your regeneration limit. Please purchase more to continue");

    // Prompt for front image
    const frontPrompt = promptGuideForFrontImage({
        bookTitle: book.title,
        content: storyContent,
        size: book.spreadSize,
        illustrationStyle: book.illustrationStyle
    });

    // Prompt for cover image
    const coverPrompt = promptGuideForCoverImage({
        authorName: book.authorName,
        content: storyContent,
        size: book.spreadSize,
        illustrationStyle: book.illustrationStyle
    });

    // LLM Response
    const llmResponse = await llm.generateFrontAndCoverImages(frontPrompt, coverPrompt, "gemini-3.1-flash-image", previousReferenceImages);
    const { frontImageBuffer, coverImageBuffer } = llmResponse;

    // Validate
    if(!frontImageBuffer) throw new ApiError(500, "Failed to generate front image");
    if(!coverImageBuffer) throw new ApiError(500, "Failed to generate cover image");

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

    // Start transactional queries
    const dbSession = await startSession();
    try
    {
        dbSession.startTransaction();
        await book.save({ session: dbSession });
        await Regeneration.updateOne(
            { userId, bookId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        );

        // Commit transaction
        await dbSession.commitTransaction();
        await deleteCacheByPattern(`books:${bookId}*`);
    }
    catch(error)
    {
        await dbSession.abortTransaction();
        throw new ApiError(500, error.message);
    }
    finally
    {
        dbSession.endSession();
    }

    // Payload
    const payload = {
        regenerations: regeneration.limit -1,
        frontUrl,
        coverUrl
    };
    
    // Response
    return response.status(201).json(new ApiResponse(201, payload, "Book front & cover images have been regenerated"));
});

// Create front or cover image with custom prompt
const createFrontOrCoverImageWithCustomPrompt = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Sanitize ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { type, customPrompt, referenceImageURL } = validatePayload(customPromptValidatorForFrontAndCover, request.body) || {};

    // Find book and spreads
    const [book, spreads] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId }).select("-_id content illustrationURL base64Image")
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to generate front and cover images for this book");
    if(book.status !== "draft") throw new ApiError(400, "Front and cover images can only be generated in draft state");
    if(book.draftStage !== 3) throw new ApiError(403, "Book should be in draft stage 3 before generating front and cover images");

    // Get previous images chunks as a reference
    const previousReferenceImages = spreads.filter(spread => spread.base64Image).map(spread => spread.base64Image);

    // Determine first time generation or regeneration
    if(type === "front" && book.frontImage)
    {
        request.payload = { type, customPrompt, referenceImageURL, previousReferenceImages, book };
        return next();
    }
    if(type === "cover" && book.backImage)
    {
        request.payload = { type, customPrompt, referenceImageURL, previousReferenceImages, book };
        return next();
    }    

    // Dynamic prompt
    let dynamicPrompt = null;
    if(type === "front")
    {
        // Prompt for front image
        dynamicPrompt = promptGuideForFrontImage({
            bookTitle: book.title,
            content: customPrompt,
            size: book.spreadSize,
            illustrationStyle: book.illustrationStyle
        });
    }
    else
    {
        dynamicPrompt = promptGuideForCoverImage({
            authorName: book.authorName,
            content: customPrompt,
            size: book.spreadSize,
            illustrationStyle: book.illustrationStyle
        });
    }

    // LLM Response
    const llmResponse = await llm.regenerateIllustration(dynamicPrompt, "gemini-3.1-flash-image", previousReferenceImages, referenceImageURL);
    const { imageBuffer } = llmResponse;

    // Validate
    if(!imageBuffer) throw new ApiError(500, "Failed to generate image");

    // Upload to cloudinary from illustration pipeline
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload image to cloudinary");

    // Set dynamic keys for json payload
    const payload = {};
    if(type === "front")
    {
        payload.frontUrl = uploadResult.secure_url;
        book.frontImage = uploadResult.secure_url;
    }
    else
    {
        payload.coverUrl = uploadResult.secure_url;
        book.backImage = uploadResult.secure_url;
    }

    // Save to db
    await book.save();
    await deleteCacheByPattern(`books:${bookId}*`);
    
    // Response
    return response.status(201).json(new ApiResponse(201, payload, `Book ${type} image has been generated with custom prompt`));     
});

// Regenerate front or cover image with custom prompt
const regenerateFrontOrCoverImageWithCustomPrompt = asyncHandler(async (request, response) => {
    // Get metadata
    const userId = request.user._id;
    const { bookId } = request.params;
    const { type, customPrompt, referenceImageURL, previousReferenceImages, book } = request.payload;

    // Find regenerations
    const regeneration = await Regeneration.findOne({ userId, bookId });
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You've reached your regeneration limit. Please purchase more to continue");

    // Dynamic prompt
    let dynamicPrompt = null;
    if(type === "front")
    {
        // Prompt for front image
        dynamicPrompt = promptGuideForFrontImage({
            bookTitle: book.title,
            content: customPrompt,
            size: book.spreadSize,
            illustrationStyle: book.illustrationStyle
        });
    }
    else
    {
        dynamicPrompt = promptGuideForCoverImage({
            authorName: book.authorName,
            content: customPrompt,
            size: book.spreadSize,
            illustrationStyle: book.illustrationStyle
        });
    }

    // LLM Response
    const llmResponse = await llm.regenerateIllustration(dynamicPrompt, "gemini-3.1-flash-image", previousReferenceImages, referenceImageURL);
    const { imageBuffer } = llmResponse;

    // Validate
    if(!imageBuffer) throw new ApiError(500, "Failed to generate image");

    // Upload to cloudinary from illustration pipeline
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload image to cloudinary");

    // Set dynamic keys for json payload
    const payload = { regenerations: regeneration.limit -1 };
    if(type === "front")
    {
        payload.frontUrl = uploadResult.secure_url;
        book.frontImage = uploadResult.secure_url;
    }
    else
    {
        payload.coverUrl = uploadResult.secure_url;
        book.backImage = uploadResult.secure_url;
    }

    // Start transactional queries
    const dbSession = await startSession();
    try
    {
        dbSession.startTransaction();
        await book.save({ session: dbSession });
        await Regeneration.updateOne(
            { userId, bookId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        );

        // Commit transaction
        await dbSession.commitTransaction();
        await deleteCacheByPattern(`books:${bookId}*`);
    }
    catch(error)
    {
        await dbSession.abortTransaction();
        throw new ApiError(500, error.message);
    }
    finally
    {
        dbSession.endSession();
    }
    
    // Response
    return response.status(201).json(new ApiResponse(201, payload, `Book ${type} image has been regenerated with custom prompt`));      
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
    await deleteCacheByPattern(`books:${bookId}*`);
    
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Book has been published"));
});

// Fetch front and back images
const fetchFrontAndBackImages = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Get from cache
    const key = `books:${bookId}:fetchFrontAndBackImages`;
    let book = await getCache(key);
    if(!book)
    {
        // Track not found attempts
        const ip = request.headers["x-real-ip"] || request.ip;
        const notFoundKey = `NotFound:${ip.replaceAll(":", "-")}`;
        const attempts = await getCache(notFoundKey);
        if(attempts >= 3) throw new ApiError(429, "Too many requests for non-existing data");

        // Get from DB
        book = await Book.findById(bookId).select("userId status draftStage frontImage backImage");
        if(!book)
        {
            // Track attempts
            const attempts = await redis.incr(notFoundKey);
            if(attempts === 1) await redis.expire(notFoundKey, 60 * 5);
            throw new ApiError(404, "Book not found");
        }
        await setCache(key, book, 20);
    }

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

// Upload manual front or cover image
const uploadManualFrontOrCoverImage = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { type, url } = validatePayload(uploadManualFrontOrCoverImageValidator, request.body) || {};    

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to upload manual illustrations for this book");
    if(book.status !== "draft") throw new ApiError(400, "Manual illustration uploads allowed only in draft state");
    if(book.draftStage !== 3) throw new ApiError(403, "Book should be in draft stage 3 for uploading front and cover images");

    // Save to db
    if(type === "front") book.frontImage = url;
    else book.backImage = url;
    await book.save();
    await deleteCacheByPattern(`books:${bookId}*`);

    // Response
    return response.status(200).json(new ApiResponse(200, null, `Book ${type} image has been uploaded`));
});

module.exports = { createBookInCustom, createBookInAI, fetchMyBooks, viewBook, viewBookContent, 
createFrontAndCoverImages, regenerateFrontAndCoverImages, createFrontOrCoverImageWithCustomPrompt, 
regenerateFrontOrCoverImageWithCustomPrompt, publishBook, fetchFrontAndBackImages, 
uploadManualFrontOrCoverImage };