const joi = require("joi");
const { allowedIllustrationStyles, allowedBookSizes, allowedIllustrationSizes, 
allowedTextSizes, allowedSpreadSizes, allowedLanguages } = require("../constants");

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
        otherwise: joi.forbidden() 
    }).label("Txt content"),

    // Prompt
    prompt: joi.when("mode", {
        is: "AI",
        then: joi.string().trim().required(),
        otherwise: joi.forbidden()
    }).label("Prompt"),

    // Metadata
    ageGroup: joi.string().trim().required().min(3).max(30).label("Age group"),
    bookSize: joi.string().trim().required().valid(...allowedBookSizes).label("Book size"),
    spreadSize: joi.string().trim().required().valid(...allowedSpreadSizes).label("Spread size"),
    textStyle: joi.string().trim().required().label("Text style"),
    illustrationStyle: joi.string().trim().required().valid(...allowedIllustrationStyles).label("Illustration Style"),
    language: joi.string().trim().required().valid(...allowedLanguages).label("Language"),

    // Spreads config
    spreads: joi.array().items(joi.object({
        mainLayoutName: joi.string().trim().required().min(3).max(50).label("Main layout name"),
        subLayoutDirection: joi.string().trim().required().min(3).max(50).label("Sub layout direction"),
        
        // Limit
        characterLimit: joi.number().integer().positive().min(50).required().label("Character limit"),
        illustrationLimit: joi.number().integer().positive().min(1).max(2).required().label("Illustration limit"),

        // Sizes
        illustrationSize: joi.object({
            size: joi.string().trim().required().label("Size"),
            aspectRatio: joi.string().trim().required().label("Aspect ratio")
        }).valid(...allowedIllustrationSizes).label("Illustration size"),
        textSize: joi.string().trim().required().valid(...allowedTextSizes).label("Text size"),
        textColor: joi.string().trim().required().label("Text color"),

        // Illustration URL
        illustrationURL: joi.string().trim().uri().optional().allow(null, "").default(null).label("Illustration url")
    })).custom((value, helpers) => {
        if(value.length !== helpers.state.ancestors[0].spreadsCount) return helpers.error("any.invalid");
        return value;
    }).label("Spreads configuration")
});

module.exports = { createBookValidator };