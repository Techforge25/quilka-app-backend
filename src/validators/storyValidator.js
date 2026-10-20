const joi = require("joi");

// Update story validator
const updateStoryValidator = joi.object({
    spreads: joi.array().min(1).items(joi.object({
        spreadId: joi.string().trim().required().length(24).label("Spread ID"),
        spreadContent: joi.string().min(3).required().label("Spread content"),        
    })).label("Spreads")
});

// Custom story refinement with AI validator
const customStoryRefinementValidator = joi.object({
    instruction: joi.string().trim().required().label("Instruction")
});

// New story validator
const newStoryValidator = joi.object({
    spreads: joi.array().min(1).items(joi.object({
        spreadId: joi.string().trim().length(24).required().label("Spread ID"),
        spreadContent: joi.string().trim().required().min(3).label("Spread content")        
    })).label("Spreads")
});

module.exports = { customStoryRefinementValidator, updateStoryValidator, newStoryValidator };