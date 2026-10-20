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

module.exports = { customStoryRefinementValidator, updateStoryValidator };