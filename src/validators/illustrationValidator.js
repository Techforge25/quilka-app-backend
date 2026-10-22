const joi = require("joi");

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
    referenceImageURL: joi.string().trim().uri().optional().allow("", null).label("Reference Image URL")
});

// Regenerate illustration validator with custom prompt (FRONT & COVER IMAGES ONLY)
const regenerateIllustrationValidator = joi.object({
    type: joi.string().trim().required().valid("front", "cover").label("Type"),
    customPrompt: joi.string().trim().min(20).max(500).optional().allow("", null).default(null).label("Custom Prompt"),
    referenceImageURL: joi.string().trim().uri().optional().allow("", null).default(null).label("Reference Image URL")
});

module.exports = { updateSpreadSublayoutValidator, uploadManualIllustrationValidator, 
generateWithCustomPromptValidator, regenerateIllustrationValidator };