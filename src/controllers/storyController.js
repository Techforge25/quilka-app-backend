const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const Book = require("../models/bookModel");
const { isValidObjectId } = require("mongoose");
const { GoogleGenAI } = require("@google/genai");
const convertToMongoId = require("../utils/convertToMongoId");
const joi = require("joi");
const validatePayload = require("../utils/validatePayload");
const { promptGuideForTextGeneration } = require("../utils/promptGuide");

// Generate story with AI
const generateWithAi = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    
    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! You are not authorized to access this book.");
    if(book.status !== "draft") throw new ApiError(403, "The story generation with AI cannot be proceeded while the book is not in draft state");
    if(book.mode !== "AI") throw new ApiError(400, "To generate story with AI, the book 'mode' must be an AI");
    if(book.hasUsedAi) throw new ApiError(403, "You have already generated story using AI");

    // Extract total spread characters
    const totalSpreadCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // AI instance
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Get dynamic prompt for text based generation
    const dynamicPrompt = promptGuideForTextGeneration({ 
        ageGroup: book.ageGroup,
        language: book.language,
        prompt: book.prompt,
        title: book.title,
        totalCharacters: totalSpreadCharacters,
        spreads: book.spreads,
    });
    if(!dynamicPrompt) throw new ApiError(500, "Failed to generate prompt for text-based story generation");

    // Generate story
    const storyResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: dynamicPrompt,
    });    
    const aiContent = storyResponse.text;

    // Validate AI content length with total spread characters
    if(aiContent.length > totalSpreadCharacters) throw new ApiError(403, "AI generated story exceeded limit");
    
    // Save to db
    book.aiContent = aiContent;
    book.hasUsedAi = true;
    await book.save();
    
    // Response
    return  response.status(200).json(new ApiResponse(200, aiContent, "Content has been generated"));
});

// Create story
const createStory = asyncHandler(async (request, response) => {
    const { prompt } = request.body || {};
    if(!prompt) throw new ApiError(400, "Prompt is required");

    // AI instance
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Send prompt to nano bnana
    // const data = await ai.models.generateContent({
    //     model: "gemini-2.5-flash-image",
    //     contents: prompt
    // });

    // Output
    // const output = data.candidates[0].content.parts;

    // Generate story
    const storyResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
    });

    // Compute tokens
    const totalTokensConsume = await ai.models.computeTokens({
        model: "gemini-3.8-flash",
        contents: prompt,
    });

    // // Logs
    console.log("Tokens", totalTokensConsume);
    console.log("Tokens info", totalTokensConsume.tokensInfo);

    const story = storyResponse.text;

    console.log(story);    

    // Response
    return response.status(200).json(new ApiResponse(200, story, "Story response has been generated"));
});

// View story content
const viewStoryContent = asyncHandler(async (request, response) => {
    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId).select("storyContent spreadsCount spreads status").lean();
    if(!book) throw new ApiError(404, "Book not found");
    if(book.status !== "draft") throw new ApiError(403, "This story cannot be viewed while the book is not in draft state");

    // Payload
    const payload = {
        storyContent: book.storyContent || "",
        spreadsCount: book.spreadsCount || 0,
        spreads: book.spreads || []
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Story content has been fetched"));
});

// // Update story
// const updateStory = asyncHandler(async (request, response) => {
//     // Sanitize book ID
//     const { bookId } = request.params;
//     if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

//     // Compute character limit
//     const [book] = await Book.aggregate([
//         // Match
//         { $match: { _id: convertToMongoId(bookId) } },      

//         // Projection
//         {
//             $project: {
//                 totalCharacters: { $sum: "$spreads.characterLimit" },
//                 status: 1
//             }
//         }
//     ]);
//     if(!book) throw new ApiError(404, "Book not found");
//     if(book.status !== "draft") throw new ApiError(403, "This story cannot be updated while the book is not in draft state");

//     // Sanitize payload
//     const updateStoryValidator = joi.object({
//         storyContent: joi.string().min(3).max(book.totalCharacters).required().label("Story content")
//     });
//     const { storyContent } = validatePayload(updateStoryValidator, request.body) || {};

//     // Response
//     return response.status(200).json(new ApiResponse(200, storyContent, "Story has been updated"));
// });

module.exports = { generateWithAi, createStory, viewStoryContent };