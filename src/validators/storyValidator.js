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

// Custom story refinement with AI validator
const customStoryRefinementValidator = joi.object({
    instruction: joi.string().trim().required().valid(...allowedInstructions).label("Instruction")
});

module.exports = { customStoryRefinementValidator };