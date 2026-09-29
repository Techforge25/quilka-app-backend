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

module.exports = { createStory };