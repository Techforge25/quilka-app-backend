const joi = require("joi");

// Patterns
const usernamePattern = "^(?=[a-z0-9._@-]*[a-z0-9])[a-z0-9]+(?:[._@-]?[a-z0-9]+)*$";
const passwordPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$";

// Update username
const updateUsernameValidator = joi.object({
    username: joi.string().trim().required().min(3).max(20).pattern(new RegExp(usernamePattern)).messages({
        "string.pattern.base": "Username can only contain letters, numbers, and at most one special character (., _, or -). Spaces are not allowed."
    }).label("Username")
});

// Update admin password validator
const updateAdminPasswordValidator = joi.object({
    currentPassword: joi.string().required().label("Current password"),

    newPassword: joi.string().required().min(8).max(50).pattern(new RegExp(passwordPattern)).messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "New password must be at least 8 characters long."
    }).label("New password"),

    confirmPassword: joi.string().valid(joi.ref("newPassword")).required().label("Confirm Password")
});

module.exports = { updateUsernameValidator, updateAdminPasswordValidator };