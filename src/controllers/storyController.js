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
const { customStoryRefinementValidator, updateStoryValidator, newStoryValidator } = require("../validators/storyValidator");
const Spread = require("../models/spreadModel");

// Generate story with AI
const generateWithAi = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book and spreads
    const [book, spreads] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId }).select("bookId content characterLimit").sort({ _id: 1 })
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to access this book.");
    if(book.status !== "draft") throw new ApiError(403, "The story generation with AI cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "The story generation with AI cannot be proceeded while the book is not in draft stage 1");
    if(book.mode !== "AI") throw new ApiError(400, "To generate story with AI, the book 'mode' must be an AI");

    // Determine first time generation or regeneration
    const isFirstTime = spreads.every(spread => spread.content === null);
    if(!isFirstTime)
    {
        request.book = book;
        request.spreads = spreads;
        return next();
    }

    // Extract total story characters limit
    const totalStoryCharactersLimit = spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // Get dynamic prompt for text based generation
    const dynamicPrompt = promptGuideForTextGeneration({ 
        ageGroup: book.ageGroup,
        language: book.language,
        prompt: book.prompt,
        title: book.title,
        totalCharacters: totalStoryCharactersLimit,
        spreads
    });

    // Generate story
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    const { aiContent } = output;

    // Split AI generated content into spreads
    const spreadContents = aiContent.split("spread break").map(content => content.trim());

    // Validate each spread content
    spreadContents.forEach((content, index) => {
        const spreadNo = index + 1;
        const characterLimit = spreads[index].characterLimit;

        if(!content || content.length < 3) throw new ApiError(400, `AI generated insufficient content for Spread ${spreadNo}`);
        if(content.length > characterLimit) throw new ApiError(400, `Character limit exceeded for Spread ${spreadNo}`);
    });

    // Prepare bulk operations
    const bulkOperations = spreads.map((spread, index) => ({
        updateOne: {
            filter: { _id: spread._id, bookId },
            update: { $set: { content: spreadContents[index] } }
        }
    }));

    // Save generated content to spreads
    const result = await Spread.bulkWrite(bulkOperations);
    if(result.matchedCount !== spreads.length) throw new ApiError(500, "Failed to save AI generated story content");

    // Payload
    const payload = {
        bookId: book._id,
        spreads: spreads.map((spread, index) => ({ spreadId: spread._id, content: spreadContents[index] }))
    };

    // Response
    return response.status(201).json(new ApiResponse(201, payload, "AI story has been generated"));
});

// Regenerate story text with AI
const regenerateStoryText = asyncHandler(async (request, response) => {
    // Get metadata
    const userId = request.user._id;
    const { bookId } = request.params;
    const { book, spreads } = request;

    // Find regenerations
    const regeneration = await Regeneration.findOne({ userId, bookId });

    // Validate
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You have reached your story regeneration limit. Please buy more!");

    // Extract total story characters limit
    const totalStoryCharactersLimit = spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // Get dynamic prompt for text regeneration
    const dynamicPrompt = promptGuideForTextRegeneration({ 
        ageGroup: book.ageGroup,
        language: book.language,
        prompt: book.prompt,
        title: book.title,
        totalCharacters: totalStoryCharactersLimit,
        spreads,
        previousStory: spreads.map(spread => spread.content?.trim()).join(" ")
    });

    // Generate story
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    const { aiContent } = output;

    // Split AI generated content into spreads
    const spreadContents = aiContent.split("spread break").map(content => content.trim());

    // Validate each spread content
    spreadContents.forEach((content, index) => {
        const spreadNo = index + 1;
        const characterLimit = spreads[index].characterLimit;

        if(!content || content.length < 3) throw new ApiError(400, `AI generated insufficient content for Spread ${spreadNo}`);
        if(content.length > characterLimit) throw new ApiError(400, `Character limit exceeded for Spread ${spreadNo}`);
    });

    // Create db session
    const dbSession = await startSession();
    try
    {
        // Start transaction
        dbSession.startTransaction();

        // Prepare bulk operations
        const bulkOperations = spreads.map((spread, index) => ({
            updateOne: {
                filter: { _id: spread._id, bookId },
                update: { $set: { content: spreadContents[index] } }
            }
        }));

        // Save generated content to spreads
        await Spread.bulkWrite(bulkOperations, { session: dbSession });

        // Update regeneration limit
        await Regeneration.updateOne(
            { userId, bookId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        );
        
        // Commit transaction
        await dbSession.commitTransaction();        

        // Payload
        const payload = {
            regenerations: regeneration.limit - 1,
            bookId: book._id,
            spreads: spreads.map((spread, index) => ({ spreadId: spread._id, content: spreadContents[index] }))
        };

        // Response
        return response.status(201).json(new ApiResponse(201, payload, "AI story has been regenerated"));
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

        // Lookup spreads
        {
            $lookup: {
                from: "spreads",
                localField: "_id",
                foreignField: "bookId",
                as: "spreads",
                pipeline: [{ $project: { mainLayoutName: 1, subLayoutDirection: 1, content: 1, 
                illustrationURL: 1, textSize: 1, characterLimit: 1, textColor: 1, textBgColor: 1 } }]
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
                status: 1,
                regenerations: "$regeneration.limit"
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
        backImage: book.backImage,
        regenerations: book.regenerations
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Story content has been fetched"));
});

// Refine story with AI
const refineStoryWithAI = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book and spread ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { instruction } = validatePayload(customStoryRefinementValidator, request.body) || {};

    // Find book, spreads and regeneration
    const [book, spreads, regeneration] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId }).select("content characterLimit").sort({ _id: 1 }),
        Regeneration.findOne({ bookId })
    ]);

    // Validate book
    if(!book) throw new ApiError(404, "Book not found");
    // if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to refine story of this book");
    if(book.status !== "draft") throw new ApiError(403, "You cannot refine story content while the book is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "You cannot refine story content while the book is not in draft stage 1");

    // Validate regeneration
    if(!regeneration) {
        console.log(regeneration);
        throw new ApiError(404, "Regenerations not found for this book")
    };
    if(regeneration.limit <= 0) throw new ApiError(403, "You've reached your story regeneration limit. Please purchase more to continue");

    // Get dynamic prompt for custom story refinement
    const dynamicPrompt = promptGuideForCustomStoryRefinement({ 
        title: book.title,
        ageGroup: book.ageGroup,
        language: book.language,
        totalCharacters: spreads.reduce((acc, spread) => acc + spread.characterLimit, 0),
        previousStory: spreads.map(spread => spread.content?.trim()).join(" "),
        instruction,
        spreads
    });

    // Generate story
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    const { aiContent } = output;

    // Split AI generated content into spreads
    const spreadContents = aiContent.split("spread break").map(content => content.trim());

    // Validate each spread content
    spreadContents.forEach((content, index) => {
        const spreadNo = index + 1;

        console.log("Index", index);
        console.log("Test", spreads[index]);
        if(!content || content.length < 3) throw new ApiError(400, `AI generated insufficient content for Spread ${spreadNo}`);
        if(content.length > spreads[index].characterLimit) throw new ApiError(400, `Character limit exceeded for Spread ${spreadNo}`);
    });

    // Update regeneration limit
    await Regeneration.updateOne(
        { userId, bookId, limit: { $gt: 0 } },
        { $inc: { limit: -1 } },
    );

    // Payload
    const payload = {
        regenerations: regeneration.limit - 1, 
        originalVersion: spreads.map(spread => spread.content.trim()).join(" "),
        newVersion: aiContent.split("spread break").join(" "),
        spreads: aiContent.split("spread break").map((c, index) => ({ spreadId: spreads[index]._id, spreadContent: c  }))
    };

    // Response
    return response.status(201).json(new ApiResponse(201, payload, "Custom story has been refined with AI"));
});

 // Use new story version
const useNewStoryVersion = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book and spread ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Sanitize payload
    const { spreads: payloadSpreads } = validatePayload(newStoryValidator, request.body) || {};

    // Find book and spreads
    const [book, spreads] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId }).select("characterLimit").sort({ _id: 1 }).lean(),
    ]);

    // Validate book
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to access this book");
    if(book.status !== "draft") throw new ApiError(403, "You cannot use new story content while the book is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "You cannot use new story content while the book is not in draft stage 1");
    if(!spreads.length) throw new ApiError(404, "No spreads found for this book");

    // Break with character limit
    const operations = spreads.map((spread, index) => ({
        updateOne: {
            filter: { _id: payloadSpreads[index].spreadId, bookId },
            update: { $set: { content: payloadSpreads[index].spreadContent } }
        } 
    }));

    // Update spreads
    await Spread.bulkWrite(operations);

    // Get updated story
    const getUpdatedStory = await Spread.find({ bookId }).select("content").sort({ _id: 1 });
    const payload = getUpdatedStory.map(spread => ({ spreadId: spread._id, spreadContent: spread.content }));

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "New story version has been applied successfully"));
});

// Update story (CUSTOM FLOW)
const updateStory = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize IDs
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId).select("userId status draftStage mode").lean();

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to update this book story");
    if(book.status !== "draft") throw new ApiError(403, "To update story, book must be in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "To update story, book must be in draft stage 1");
    if(book.mode !== "CUSTOM") throw new ApiError(400, "To update story, the book must be in 'CUSTOM' mode");

    // Sanitize payload
    const { spreads } = validatePayload(updateStoryValidator, request.body) || {};

    // Get spread IDs
    const spreadIds = spreads.map((spread) => spread.spreadId);

    // Find existing spreads
    const existingSpreads = await Spread.find({ _id: { $in: spreadIds }, bookId }).select("_id").lean();

    // Validate spread IDs
    if(existingSpreads.length !== spreads.length) throw new ApiError(400, "One or more spreads are invalid or do not belong to this book");

    // Prepare bulk operations
    const operations = spreads.map((spread) => ({
        updateOne: {
            filter: { _id: spread.spreadId, bookId },
            update: { $set: { content: spread.spreadContent } }
        }
    }));

    // Update spreads
    await Spread.bulkWrite(operations);

    // Response
    return response.status(200).json(new ApiResponse(200, spreads, "Story has been updated successfully"));
});

// Update story with spread text size (AI & CUSTOM)
const updateStoryWithSpreadTextSize = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Find book and spread
    const [book, spread] = await Promise.all([
        Book.findById(bookId),
        Spread.findById(spreadId).select("content characterLimit textSize")
    ]);
    if(!book) throw new ApiError(404, "Book not found");
    if(!spread) throw new ApiError(404, "Spread not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to update story of this book");
    if(book.status !== "draft") throw new ApiError(403, "You cannot update book content while it is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "You cannot update book content while it is not in draft stage 1");

    // Sanitize payload
    const updateStoryValidator = joi.object({
        spreadContent: joi.string().min(3).max(spread.characterLimit).required().label("Spread content"),
        textSize: joi.string().trim().required().valid(...allowedTextSizes).label("Text size")
    });
    const { spreadContent, textSize } = validatePayload(updateStoryValidator, request.body) || {};

    // Save to db
    spread.content = spreadContent;
    spread.textSize = textSize;
    await spread.save();

    // Response
    return response.status(200).json(new ApiResponse(200, spreadContent, "Story has been updated"));
});

// Finalize text phase
const finalizeTextPhase = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book and spreads
    const [book, spreads] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId })
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to mark this book for draft stage 2");
    if(book.status !== "draft") throw new ApiError(403, "Story text can only be finalized in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "Stroy text can only be finalized in draft stage 1");

    // Prevent finalizing befor filling all spreads
    const remainingSpreads = spreads.filter(spread => !spread.content || spread.content === null);
    if(remainingSpreads.length) throw new ApiError(400, `Please add text content to your remaining ${remainingSpreads.length} spreads before making it to draft stage 2`);

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

    // Find book and spreads
    const [book, spreads] = await Promise.all([
        Book.findById(bookId),
        Spread.find({ bookId })
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to mark this book for draft stage 3");
    if(book.status !== "draft") throw new ApiError(403, "Illustrations can only be finalized in draft state");
    if(book.draftStage !== 2) throw new ApiError(400, "Illustrations can only be finalized in draft stage 2");

    // Check if all illustrations are generated and fulfilled
    const unfilledIllustrations = spreads.filter(spread => !spread.illustrationURL || spread.illustrationURL === null);
    if(unfilledIllustrations.length)
    {
        throw new ApiError(400, `Please generate illustrations for remaining ${unfilledIllustrations.length} spreads before making it to draft stage 3`);
    }

    // Save to db
    book.draftStage = 3;
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Illustration has been finalized"));
});

module.exports = { generateWithAi, regenerateStoryText, viewStoryContent, useNewStoryVersion, updateStory,
refineStoryWithAI, updateStoryWithSpreadTextSize, finalizeTextPhase, finalizeIllustrationPhase };