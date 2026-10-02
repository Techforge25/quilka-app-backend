const joi = require("joi");

// Create book validator
const createBookValidator = joi.object({
    // Book creation mode
    mode: joi.string().trim().required().valid("CUSTOM", "AI").label("Mode"),

    // Basic info
    title: joi.string().trim().min(3).max(60).required().label("Title"),
    authorName: joi.string().trim().min(3).max(20).required().label("Author name"),
    spreadsCount: joi.number().integer().positive().min(1).required().label("Spreads count"),

    // Txt content
    txtContent: joi.string().min(100).required().when("mode", { 
        is: "CUSTOM", 
        then: joi.required(), 
        otherwise: joi.optional().allow("", null) 
    }).label("Txt content"),

    // Story length
    storyLength: joi.number().integer().positive().required().label("Story length"),

    // Prompt
    prompt: joi.when("mode", {
        is: "AI",
        then: joi.string().trim().required(),
        otherwise: joi.forbidden()
    }).label("Prompt"),

    // AI content
    aiContent: joi.string().min(100).required().when("mode", { 
        is: "AI", 
        then: joi.required(), 
        otherwise: joi.forbidden() 
    }).label("AI content"),

    // Metadata
    ageGroup: joi.string().trim().required().min(3).max(30).label("Age group"),
    bookSize: joi.string().trim().required().min(3).max(30).label("Book size"),
    illustrationStyle: joi.string().trim().required().min(3).max(30).label("Illustration Style"),
    language: joi.string().trim().required().valid("English", "Arabic", "Spanish", "Hindi", "Afrikaans").label("Language"),

    // Spreads config
    spreads: joi.array().items(joi.object({
        mainLayoutName: joi.string().trim().required().min(3).max(50).label("Main layout name"),
        subLayoutDirection: joi.string().trim().required().min(3).max(50).label("Sub layout direction"),        
        characterLimit: joi.number().integer().positive().min(50).required().label("Character limit"),
        illustrationLimit: joi.number().integer().positive().min(1).max(2).required().label("Illustration limit"),
    })).custom((value, helpers) => {
        if(value.length !== helpers.state.ancestors[0].spreadsCount) return helpers.error("any.invalid");
        return value;
    }).label("Spreads configuration")
});

module.exports = { createBookValidator };