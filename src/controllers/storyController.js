const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const Book = require("../models/bookModel");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../utils/convertToMongoId");
const joi = require("joi");
const validatePayload = require("../utils/validatePayload");
const { promptGuideForTextGeneration, promptGuideForTextRegeneration, 
promptGuideForCustomStoryRefinement } = require("../utils/promptGuide");
const llm = require("../service/llmService");
const { allowedTextSizes } = require("../constants");
const Regeneration = require("../models/regenerationModel");
const { startSession } = require("mongoose");
const { customStoryRefinementValidator } = require("../validators/storyValidator");

// Generate story with AI
const generateWithAi = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    
    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to access this book.");
    if(book.status !== "draft") throw new ApiError(403, "The story generation with AI cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "The story generation with AI cannot be proceeded while the book is not in draft stage 1");
    if(book.mode !== "AI") throw new ApiError(400, "To generate story with AI, the book 'mode' must be an AI");

    // Pass to regeneration text controller
    if(book.aiContent)
    {
        request.book = book;
        return next();
    }

    // Extract total spread characters
    const totalSpreadCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // Get dynamic prompt for text based generation
    const dynamicPrompt = promptGuideForTextGeneration({ 
        ageGroup: book.ageGroup,
        language: book.language,
        prompt: book.prompt,
        title: book.title,
        totalCharacters: totalSpreadCharacters,
        spreads: book.spreads
    });

    // Generate story
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    const { aiContent } = output;

    // Validate AI content length with total spread characters
    if(aiContent.length > totalSpreadCharacters) throw new ApiError(403, "AI generated story exceeded limit");
    
    // Save to db
    book.aiContent = aiContent;
    await book.save(); 
    
    // Response
    return  response.status(201).json(new ApiResponse(201, aiContent, "Content has been generated"));
});

// Regenerate story text with AI
const regenerateStoryText = asyncHandler(async (request, response) => {
    // Get metadata
    const userId = request.user._id;
    const { bookId } = request.params;
    const book = request.book;

    // Find regenerations
    const regeneration = await Regeneration.findOne({ userId, bookId });

    // Validate
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You have reached your story regeneration limit. Please buy more!");

    // Extract total spread characters
    const totalSpreadCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // Get dynamic prompt for text based generation
    const dynamicPrompt = promptGuideForTextRegeneration({ 
        ageGroup: book.ageGroup,
        language: book.language,
        prompt: book.prompt,
        previousStory: book.aiContent,
        title: book.title,
        totalCharacters: totalSpreadCharacters,
        spreads: book.spreads
    });

    // Generate story
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    const { aiContent } = output;

    // Validate AI content length with total spread characters
    if(aiContent.length > totalSpreadCharacters) throw new ApiError(403, "AI generated story exceeded limit");

    // Create db session
    const dbSession = await startSession();
    try
    {
        // Start transaction
        dbSession.startTransaction();

        // Update AI content
        await Book.updateOne(
            { _id: bookId, userId }, 
            { $set: { aiContent } }, 
            { session: dbSession }
        ),

        // Update regeneration limit
        await Regeneration.updateOne(
            { userId, bookId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        )

        // Commit transaction
        await dbSession.commitTransaction();
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
    return  response.status(201).json(new ApiResponse(201, aiContent, "Content has been regenerated"));
});

// View story content
const viewStoryContent = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");   

    // Find book
    const [book] = await Book.aggregate([
        // Match
        { $match: { _id: convertToMongoId(bookId) } },

        // Add fields
        {
            $addFields: {
                storyContent: {
                    $cond: [
                        { $eq: ["$mode", "CUSTOM"] },
                        "$txtContent",
                        "$aiContent"
                    ]
                }
            }
        },

        // Add story parts
        {
            $addFields: {
                storyParts: {
                    $cond: [
                        { $eq: ["$mode", "AI"] },

                        // AI story content
                        {
                            $split: [
                                { $ifNull: ["$storyContent", ""] },
                                "spread break"
                            ]
                        },

                        // Custom story content
                        {
                            $reduce: {
                                input: { $ifNull: ["$spreads", []] },
                                initialValue: {
                                    offset: 0,
                                    parts: []
                                },
                                in: {
                                    offset: {
                                        $add: [
                                            "$$value.offset",
                                            { $max: [0, { $ifNull: ["$$this.characterLimit", 0] }] }
                                        ]
                                    },
                                    parts: {
                                        $concatArrays: [
                                            "$$value.parts",
                                            [
                                                {
                                                    $substrCP: [
                                                        { $ifNull: ["$storyContent", ""] },
                                                        "$$value.offset",
                                                        { $max: [0, { $ifNull: ["$$this.characterLimit", 0] }] }
                                                    ]
                                                }
                                            ]
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        },

        // Extract custom story parts
        {
            $addFields: {
                storyParts: {
                    $cond: [
                        { $eq: ["$mode", "CUSTOM"] },
                        "$storyParts.parts",
                        "$storyParts"
                    ]
                }
            }
        },

        // Map spreads with content
        {
            $addFields: {
                spreads: {
                    $map: {
                        input: {
                            $range: [
                                0,
                                { $size: { $ifNull: ["$spreads", []] } }
                            ]
                        },
                        as: "index",
                        in: {
                            $mergeObjects: [
                                { $arrayElemAt: ["$spreads", "$$index"] },
                                {
                                    content: {
                                        $ifNull: [
                                            { $arrayElemAt: ["$storyParts", "$$index"] },
                                            ""
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },

        // Projection
        {
            $project: {
                _id: 1,
                userId: 1,
                title: 1,
                frontImage: 1,
                backImage: 1,
                authorName: 1,
                illustrationStyle: 1,
                mode: 1,
                spreadsCount: 1,
                spreads: 1,
                spreadSize: 1,
                status: 1
            }
        }
    ]);
    if(!book) throw new ApiError(404, "Book not found");
    if(book.status === "pending") throw new ApiError(403, "This story cannot be viewed while the book is in a pending state");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to view this story content");

    // Payload
    const payload = {
        bookId: book._id,
        title: book.title,
        authorName: book.authorName,
        illustrationStyle: book.illustrationStyle,
        mode: book.mode,
        spreadsCount: book.spreadsCount || 0,
        spreads: book.spreads || [],
        spreadSize: book.spreadSize,
        frontImage: book.frontImage,
        backImage: book.backImage
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Story content has been fetched"));
});

// Refine custom story with AI
const refineCustomStoryWithAI = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book and spread ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { instruction } = validatePayload(customStoryRefinementValidator, request.body) || {};

    // Find book and regeneration
    const [book, regeneration] = await Promise.all([
        Book.findById(bookId),
        Regeneration.findOne({ userId, bookId })
    ]);

    // Validate book
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to refine story of this book");
    if(book.status !== "draft") throw new ApiError(403, "You cannot refine story content while the book is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "You cannot refine story content while the book is not in draft stage 1");
    if(book.mode !== "CUSTOM") throw new ApiError(400, "Story refinement is only available for books created in CUSTOM mode");
    if(!book.txtContent) throw new ApiError(400, "Text content for previous story is missing");

    // Validate regeneration
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You have reached your story regeneration limit. Please buy more!");    

    // Extract total spread characters
    const totalSpreadCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);    

    // Get dynamic prompt for custom story refinement
    const dynamicPrompt = promptGuideForCustomStoryRefinement({
        title: book.title,
        ageGroup: book.ageGroup,
        language: book.language,
        totalCharacters: totalSpreadCharacters,
        previousStory: book.txtContent,
        instruction
    });

    // Generate story
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    const { aiContent } = output;

    // Validate AI content length with total spread characters
    if(aiContent.length > totalSpreadCharacters) throw new ApiError(403, "AI generated story exceeded limit");
    
    // Create db session
    const dbSession = await startSession();
    try
    {
        // Start transaction
        dbSession.startTransaction();

        // Update custom story refinement
        await Book.updateOne(
            { _id: bookId, userId, mode: "CUSTOM" },
            { $set: { txtContent: aiContent } },
            { session: dbSession }
        );

        // Update regeneration limit
        await Regeneration.updateOne(
            { bookId, userId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        );

        // Commit transaction
        await dbSession.commitTransaction();
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
    return response.status(200).json(new ApiResponse(200, { story: aiContent }, "Your custom story has been refined with AI"));
});

// Update story (CUSTOM FLOW)
const updateStory = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    
    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to update this book story");
    if(book.status !== "draft") throw new ApiError(403, "To update story, book must be in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "To update story, book must be in draft stage 1");
    if(book.mode !== "CUSTOM") throw new ApiError(400, "To update story, the book mode must be 'CUSTOM'");

    // Total story characters
    const totalStoryCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);    

    // Sanitize payload
    const updateStoryValidator = joi.object({
        storyContent: joi.string().min(3).max(totalStoryCharacters).required().label("Story content"),
    });
    const { storyContent } = validatePayload(updateStoryValidator, request.body) || {};

    // Divide spreads
    const dataInSpreads = storyContent.split("spread break");
    if(!dataInSpreads.length) throw new ApiError(400, "Story content is missing");
    
    // Validate character limit for each spread
    dataInSpreads.forEach((content, index) => {
        if(content.length > book.spreads[index].characterLimit)
        {
            throw new ApiError(400, `Character limit exceeded for Spread ${index + 1}`);
        }
    });

    // Save to db
    book.txtContent = storyContent;
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, storyContent, "Story has been updated"));
});

// Update story with spread text size (AI & CUSTOM)
const updateStoryWithSpreadTextSize = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book and spread ID
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
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to update story of this book");
    if(book.status !== "draft") throw new ApiError(403, "You cannot update book content while it is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "You cannot update book content while it is not in draft stage 1");

    // Total story characters
    const totalStoryCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // Sanitize payload
    const updateStoryValidator = joi.object({
        storyContent: joi.string().min(3).max(totalStoryCharacters).required().label("Story content"),
        textSize: joi.string().trim().required().valid(...allowedTextSizes).label("Text size")
    });
    const { storyContent, textSize } = validatePayload(updateStoryValidator, request.body) || {};

    // Divide spreads
    const dataInSpreads = storyContent.split("spread break");
    if(!dataInSpreads.length) throw new ApiError(400, "Story content is missing");
    
    // Validate character limit for each spread
    dataInSpreads.forEach((content, index) => {
        if(content.length > book.spreads[index].characterLimit)
        {
            throw new ApiError(400, `Character limit exceeded for Spread ${index + 1}`);
        }
    });

    // Save to db
    if(book.mode === "CUSTOM")
    {
        book.txtContent = storyContent;
    }
    else
    {
        book.aiContent = storyContent;
    }
    spread.textSize = textSize;
    await book.save();

    // Dynamic response
    const responseData = book.mode === "CUSTOM" ? book.txtContent : book.aiContent;

    // Response
    return response.status(200).json(new ApiResponse(200, responseData, "Story has been updated"));
});

// Finalize text phase
const finalizeTextPhase = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to mark this book for draft stage 2");
    if(book.status !== "draft") throw new ApiError(403, "Story text can only be finalized in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "Stroy text can only be finalized in draft stage 1");
    if(!book.txtContent && !book.aiContent) throw new ApiError(400, "Please create some text for your story, before making it to draft stage 2");

    // Save to db
    book.draftStage = 2;
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Book has been marked for draft stage 2"));
});

// Finalize illustration
const finalizeIllustrationPhase = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize Book
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to mark this book for draft stage 3");
    if(book.status !== "draft") throw new ApiError(403, "Illustrations can only be finalized in draft state");
    if(book.draftStage !== 2) throw new ApiError(400, "Illustrations can only be finalized in draft stage 2");

    // Check if all illustrations are generated and fulfilled
    const unfilledIllustrations = book.spreads.filter(spread => spread.illustrationURL === null);
    if(unfilledIllustrations.length > 0)
    {
        throw new ApiError(400, `Please generate illustrations for remaining ${unfilledIllustrations.length} spreads before making it to draft stage 3`);
    }

    // Save to db
    book.draftStage = 3;
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Illustration has been finalized"));
});

module.exports = { generateWithAi, regenerateStoryText, viewStoryContent, updateStory,
refineCustomStoryWithAI, updateStoryWithSpreadTextSize, finalizeTextPhase, finalizeIllustrationPhase };