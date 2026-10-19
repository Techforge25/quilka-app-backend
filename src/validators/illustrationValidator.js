const joi = require("joi");

// Create illustration validator
const createIllustrationValidator = joi.object({
    content: joi.string().trim().min(3).required().label("Content")
});

// Update spread sublayout validator
const updateSpreadSublayoutValidator = joi.object({
    textColor: joi.string().trim().required().label("Text color"),
    textBgColor: joi.string().trim().required().label("Text bg color"),
    subLayoutDirection: joi.string().trim().required().min(3).max(50).label("Sub layout direction")
});

// Upload manual illustration validator
const uploadManualIllustrationValidator = joi.object({
    illustrationURL: joi.string().trim().uri().required().label("Illustration URL")
});

// Generate illustration with custom prompt validator
const generateWithCustomPromptValidator = joi.object({
    customPrompt: joi.string().trim().min(20).max(500).required().label("Custom Prompt"),
    referenceImageURL: joi.string().trim().uri().required().label("Reference Image URL")
});

module.exports = { createIllustrationValidator, updateSpreadSublayoutValidator, 
uploadManualIllustrationValidator, generateWithCustomPromptValidator };