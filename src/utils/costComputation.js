
const llm = require("../service/llmService");
const ApiError = require("./ApiError");

// Text generation cost computation
const computeTextGenerationCost = (model, tokensMetadata) => {
    if(!Object.values(llm.model.text).includes(model)) throw new ApiError(500, "Invalid model! This model is not configured in LLM service.");
    try
    {
        // Extract token counts
        const { promptTokenCount = 0, candidatesTokenCount = 0, thoughtsTokenCount = 0, totalTokenCount } = tokensMetadata || {};

        // Calculate input cost
        const inputCost = (promptTokenCount / 1000000) * llm.pricing.text[model].input;

        // Calculate output cost (Including thoughts tokens)
        const outputCost = ((candidatesTokenCount + thoughtsTokenCount) / 1000000) * llm.pricing.text[model].output;

        // Calculate total cost
        const totalCost = inputCost + outputCost;

        // Prepare payloads
        const usage = { 
            promptTokens: promptTokenCount,
            candidatesTokens: candidatesTokenCount,
            thoughtsTokens: thoughtsTokenCount,
            totalTokens: totalTokenCount
        };
        const costing = { inputCost, outputCost, totalCost };

        return { usage, costing };
    }
    catch(error)
    {
        throw error;
    }
};

// Image generation cost computation
const computeImageGenerationCost = (model, tokensMetadata) => {
    if(!Object.values(llm.model.image).includes(model)) throw new ApiError(500, "Invalid model! This model is not configured in LLM service.");    
    try
    {
        // Extract token counts
        const { promptTokenCount = 0, candidatesTokenCount = 0, thoughtsTokenCount = 0, totalTokenCount, candidatesTokensDetails = [] } = tokensMetadata || {};

        // Extract image output tokens
        const imageTokens = candidatesTokensDetails
        .filter(item => item.modality === "IMAGE")
        .reduce((total, item) => total + item.tokenCount, 0);    

        // Calculate input cost
        const inputCost = (promptTokenCount / 1000000) * llm.pricing.image[model].input;

        // Calculate output cost (Including thoughts tokens)
        const outputTokens = Math.max(0, candidatesTokenCount - imageTokens);
        const outputCost = ((outputTokens + thoughtsTokenCount) / 1000000) * llm.pricing.image[model].output;

        // Calculate image output cost
        const imageOutputCost = (imageTokens / 1000000) * (llm.pricing.image[model].imageOutput || 0);

        // Calculate total cost
        const totalCost = inputCost + outputCost + imageOutputCost;

        // Prepare payloads
        const usage = { 
            promptTokens: promptTokenCount,
            candidatesTokens: outputTokens,
            thoughtsTokens: thoughtsTokenCount,
            imageTokens: imageTokens,
            totalTokens: totalTokenCount
        };
        const costing = { inputCost, outputCost, imageOutputCost, totalCost };

        return { usage, costing };
    }
    catch(error)
    {
        throw error;
    }
};

module.exports = { computeTextGenerationCost, computeImageGenerationCost };