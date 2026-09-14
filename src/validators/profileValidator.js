const joi = require("joi");

// Patterns
const passowrdPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$";
const fullNamePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

// Update info validator
const updateInfoValidator = joi.object({
    fullName: joi.string().trim().min(2).max(60).pattern(fullNamePattern).required().label("Full name"),
});

// Update password validator
const updatePasswordValidator = joi.object({
    currentPassword: joi.string().required().label("Current password"),
    newPassword: joi.string().min(8).max(128).pattern(new RegExp(passowrdPattern)).required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("New password"),
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required().label("Confirm Password")    
});

module.exports = { updateInfoValidator, updatePasswordValidator };