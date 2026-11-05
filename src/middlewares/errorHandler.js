const { isLocal } = require("../constants");
const ApiError = require("../utils/ApiError");
const { MongooseError } = require("mongoose");
const { ApiError: GeminiApiError } = require("@google/genai");

const errorHandler = (error, request, response, next) => {
    // API Error
    if(error instanceof ApiError)
    {
        // Extract metadata
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        const data = error.data || null;
        const success = error.success || false;
        const stack = isLocal ? error.stack || "No stack trace found" : undefined

        // Response
        return response.status(statusCode)
        .json({ statusCode, message, data, success, stack });
    }

    // Mongoose Error
    if(error instanceof MongooseError)
    {
        // Response
        return response.status(400).json({ 
            statusCode: 400, 
            message: error.message, 
            data: null, 
            success: false, 
            stack: isLocal ? error.stack || "No stack trace found" : undefined
        });        
    }

    // Gemini Error
    if(error instanceof GeminiApiError)
    {
        // Parse error object
        const genAIError = JSON.parse(error.message);
        const { code, message, status } = genAIError.error || {};

        // Hide billing error explicitly
        if(code === 402)
        {
            return response.status(503).json({ 
                statusCode: 503, 
                message: "Our service is currently under maintenance. Please try again later.",
                data: null,
                success: false
            });
        }
        else
        {
            // Fallback response for Gemini Error
            return response.status(code).json({ statusCode: code, message, data: null, status, success: false });            
        }
    }

    // Fallback response for unexpected errors
    return response.status(500).json({ 
        statusCode: 500, 
        message: error.message || "Something went wrong!",
        data: error.data || null,
        success: false,
        stack: isLocal ? error.stack || "No stack trace found" : undefined
    });
};

module.exports = errorHandler;