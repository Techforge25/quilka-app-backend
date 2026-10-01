const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { GoogleGenAI } = require("@google/genai");

// Create story
const createStory = asyncHandler(async (request, response) => {
    const { prompt } = request.body || {};
    if(!prompt) throw new ApiError(400, "Prompt is required");

    // AI instance
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Generate story
    const storyResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
    });
    
    // Get story
    const story = storyResponse.text;

    // Get token usage
    const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = storyResponse.usageMetadata;

    // Logs
    console.log("Input Tokens:", promptTokenCount);
    console.log("Output Tokens:", candidatesTokenCount);
    console.log("Thinking Tokens:", thoughtsTokenCount);
    console.log("Total Tokens:", totalTokenCount);
    console.log("Story", story);   

    // Response
    return response.status(200).json(new ApiResponse(200, story, "Story response has been generated"));
});

module.exports = { createStory };