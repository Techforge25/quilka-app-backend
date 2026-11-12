
const llm = require("../service/llmService");
const ApiError = require("./ApiError");

// Model pricing (Per 1 Million Tokens in USD)
const pricing = {
    // Text Generation
    "gemini-3.8-flash": { input: 0.75, output: 3.75 },
    "gemini-3.7-flash": { input: 0.75, output: 3.75 },
    "gemini-3.6-flash": { input: 0.75, output: 3.75 },
    "gemini-3.5-flash": { input: 1.50, output: 9.00 },
    "gemini-3.5-flash-lite": { input: 0.30, output: 2.50 },

    // Image Generation
    "gemini-3-pro-image": { input: 2.00, output: 12.00, imageOutput: 120.00 },
    "gemini-3.1-flash-image": { input: 0.50, output: 3.00, imageOutput: 60.00 },
    "gemini-3.1-flash-lite-image": { input: 0.25, output: 1.50, imageOutput: 30.00 }
};

// Text generation cost computation
const computeTextGenerationCost = (model, usage) => {
    if(!Object.values(llm.model.text).includes(model)) throw new ApiError(500, "Invalid model! This model is not configured in LLM service.");

    // Extract token counts
    const { promptTokenCount = 0, candidatesTokenCount = 0, thoughtsTokenCount = 0 } = usage || {};

    // Calculate input cost
    const inputCost = (promptTokenCount / 1000000) * pricing[model].input;

    // Calculate output cost (Including thoughts tokens)
    const outputCost = ((candidatesTokenCount + thoughtsTokenCount) / 1000000) * pricing[model].output;

    // Calculate total cost
    const totalCost = inputCost + outputCost;

    return { inputCost, outputCost, totalCost };
};

// Image generation cost computation
const computeImageGenerationCost = (model, usage) => {
    if(!Object.values(llm.model.image).includes(model)) throw new ApiError(500, "Invalid model! This model is not configured in LLM service.");    

    // Extract token counts
    const { promptTokenCount = 0, candidatesTokenCount = 0, thoughtsTokenCount = 0, candidatesTokensDetails = [] } = usage || {};

    // Extract image output tokens
    const imageTokens = candidatesTokensDetails
    .filter(item => item.modality === "IMAGE")
    .reduce((total, item) => total + item.tokenCount, 0);    

    // Calculate input cost
    const inputCost = (promptTokenCount / 1000000) * pricing[model].input;

    // Calculate output cost (Including thoughts tokens)
    const outputTokens = Math.max(0, candidatesTokenCount - imageTokens);
    const outputCost = ((outputTokens + thoughtsTokenCount) / 1000000) * pricing[model].output;

    // Calculate image output cost
    const imageOutputCost = (imageTokens / 1000000) * (pricing[model].imageOutput || 0);

    // Calculate total cost
    const totalCost = inputCost + outputCost + imageOutputCost;

    return { inputCost, outputCost, imageOutputCost, totalCost };
};

module.exports = { computeTextGenerationCost, computeImageGenerationCost };