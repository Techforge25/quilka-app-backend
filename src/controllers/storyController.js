const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const Book = require("../models/bookModel");
const { isValidObjectId } = require("mongoose");
const { GoogleGenAI } = require("@google/genai");
const convertToMongoId = require("../utils/convertToMongoId");
const joi = require("joi");
const validatePayload = require("../utils/validatePayload");

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

module.exports = { createStory, viewStoryContent };