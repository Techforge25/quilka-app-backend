const joi = require("joi");

// Create illustration validator
const createIllustrationValidator = joi.object({
    content: joi.string().trim().required().label("Content")
});

// Update text color and text bg color validator
const updateColorValidator = joi.object({
    textColor: joi.string().trim().required().label("Text color"),
    textBgColor: joi.string().trim().required().label("Text bg color")
});

// Upload manual illustration validator
const uploadManualIllustrationValidator = joi.object({
    illustrationURL: joi.string().trim().uri().required().label("Illustration URL")
});

// Generate illustration with custom prompt validator
const generateWithCustomPromptValidator = joi.object({
    prompt: joi.string().trim().min(20).max(500).required().label("Prompt"),
    imageURL: joi.string().trim().uri().required().label("Image URL")
});

module.exports = { createIllustrationValidator, updateColorValidator, 
uploadManualIllustrationValidator, generateWithCustomPromptValidator };