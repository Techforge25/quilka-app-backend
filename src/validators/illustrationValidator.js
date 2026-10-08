const joi = require("joi");

// Create illustration validator
const createIllustrationValidator = joi.object({
    content: joi.string().trim().required().label("Content")
});

module.exports = { createIllustrationValidator };