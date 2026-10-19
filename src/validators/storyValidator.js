const joi = require("joi");

// Allowed instructions
const allowedInstructions = [
    "Make It More Engaging", 
    "Make Shorter", 
    "Make Simpler", 
    "Make More Magical", 
    "Make More Fun", 
    "Improve The Dialogue"
];

// Update story validator
const updateStoryValidator = joi.object({
    spreads: joi.array().min(1).items(joi.object({
        spreadId: joi.string().trim().required().length(24).label("Spread ID"),
        spreadContent: joi.string().min(3).required().label("Spread content"),        
    })).label("Spreads")
});

// Custom story refinement with AI validator
const customStoryRefinementValidator = joi.object({
    instruction: joi.string().trim().required().valid(...allowedInstructions).label("Instruction")
});

module.exports = { customStoryRefinementValidator, updateStoryValidator };