const joi = require("joi");

// Patterns
const usernamePattern = /^(?=.{3,20}$)[a-z][a-z0-9]*(?:[@_]?[a-z0-9]+)*$/;

// Update username
const updateUsernameValidator = joi.object({
    username: joi.string().trim().required().pattern(usernamePattern).messages({
        "string.pattern.base": "Username must be 3–20 characters long and contain only numbers, periods, or underscores. It must start with a letter and cannot contain consecutive or trailing special characters."
    }).label("Username")
});

module.exports = { updateUsernameValidator };