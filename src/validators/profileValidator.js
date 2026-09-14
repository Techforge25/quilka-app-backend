const joi = require("joi");

// Patterns
const passowrdPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$";
const fullNamePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

// Update info validator
const updateInfoValidator = joi.object({
    fullName: joi.string().trim().min(2).max(60).pattern(fullNamePattern).required().label("Full name"),
});

module.exports = { updateInfoValidator };