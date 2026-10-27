const { isLocal } = require("../constants");
const ApiError = require("../utils/ApiError");
const { ApiError: GeminiApiError } = require("@google/genai");

const errorHandler = (error, request, response, next) => {
    // Gemini Error
    if(error instanceof GeminiApiError)
    {
        // Parse error object
        const genAIError = JSON.parse(error.message);
        const { code, message, status } = genAIError.error || {};

        // Hide billing error explicitly
        if(code === 402)
        {
            return response.status(503)
            .json({ statusCode: 503, message: "Our service is currently under maintenance. Please try again later.", success: false });
        }
        else
        {
            // Fallback response for Gemini Error
            return response.status(code).json({ statusCode: code, message, status, success: false });            
        }
    }

    // API Error
    if(error instanceof ApiError)
    {
        // Extract metadata
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        const success = error.success || false;
        const stack = isLocal ? error.stack || "No stack trace found" : undefined 

        // Response
        return response.status(statusCode)
        .json({ statusCode, message, success, stack });
    }
    else
    {
        // Fallback response for unexpected errors
        return response.status(500)
        .json({ 
            statusCode: 500, 
            message: error.message || "Something went wrong!", 
            success: false,
            stack: isLocal ? error.stack || "No stack trace found" : undefined
        });        
    }
};

module.exports = errorHandler;