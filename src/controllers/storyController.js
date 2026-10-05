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
const llm = require("../service/llmService");

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
    const output = await llm.generateStoryText(dynamicPrompt, "gemini-3.5-flash");
    if(!output) throw new ApiError(500, "Failed to generate AI content. LLM is temporarily down");
    const { aiContent, promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = output;

    // Log token consumption
    console.log("Prompt token", promptTokenCount);
    console.log("Canditates token", candidatesTokenCount);
    console.log("Thoughts token", thoughtsTokenCount);
    console.log("Total token", totalTokenCount);

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
                    $split: [
                        { $ifNull: ["$storyContent", ""] },
                        "\n\nspread\n\n"
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
                spreadsCount: 1,
                spreads: 1,
                status: 1
            }
        }
    ]);
    if(!book) throw new ApiError(404, "Book not found");
    if(book.status !== "draft") throw new ApiError(403, "This story cannot be viewed while the book is not in draft state");

    // Payload
    const payload = {
        spreadsCount: book.spreadsCount || 0,
        spreads: book.spreads || []
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Story content has been fetched"));
});

// Update story
const updateStory = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "Forbidden! This book does not belong to you");
    if(book.status !== "draft") throw new ApiError(403, "You cannot update book content while it is not in draft state");
    if(book.draftStage !== 1) throw new ApiError(403, "You cannot update book content while it is not in draft stage 1");

    // Total story characters
    const totalStoryCharacters = book.spreads.reduce((acc, spread) => acc + spread.characterLimit, 0);

    // Sanitize payload
    const updateStoryValidator = joi.object({
        storyContent: joi.string().min(3).max(totalStoryCharacters).required().label("Story content")
    });
    const { storyContent } = validatePayload(updateStoryValidator, request.body) || {};

    // Save to db
    if(book.mode === "CUSTOM")
    {
        book.txtContent = storyContent;
    }
    else
    {
        book.aiContent = storyContent;
    }
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, storyContent, "Story has been updated"));
});

module.exports = { generateWithAi, createStory, viewStoryContent, updateStory };