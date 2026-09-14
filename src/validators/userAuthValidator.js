const joi = require("joi");

// Patterns
const passowrdPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$";
const fullNamePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

// User signup validator
const userSignupValidator = joi.object({
    fullName: joi.string().trim().min(2).max(60).pattern(fullNamePattern).required().label("Full name"),
    email: joi.string().trim().email().max(50).lowercase().required().label("Email"),
    password: joi.string().min(8).max(128).pattern(new RegExp(passowrdPattern)).required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password"),
    confirmPassword: joi.string().valid(joi.ref("password")).required().label("Confirm Password")
});

// User login validator
const userLoginValidator = joi.object({
    email: joi.string().trim().email().lowercase().required().label("Email"),
    password: joi.string().trim().required().label("Password")
});

// Verify otp validator
const verifyOtpValidator = joi.object({
    userId: joi.string().trim().length(24).required().label("User ID"),
    accountVerificationToken: joi.string().trim().length(6).required().label("OTP")
});

// Resend OTP validator
const resendOtpValidator = joi.object({
    email: joi.string().trim().email().lowercase().required().label("Email")
});

// Forgot password validator
const forgotPasswordValidator = joi.object({
    email: joi.string().trim().email().lowercase().required().label("Email")
});

// Verify reset password otp validator
const verifyResetPasswordOTPValidator = joi.object({
    email: joi.string().trim().email().lowercase().required().label("Email"),
    resetPasswordOTP: joi.string().trim().length(6).required().label("OTP")
});

// Reset password validator
const resetPasswordValidator = joi.object({
    resetPasswordOTP: joi.string().trim().length(6).required().label("OTP"),
    email: joi.string().trim().email().lowercase().required().label("Email"),
    newPassword: joi.string().min(8).max(128).pattern(new RegExp(passowrdPattern)).required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("New Password"),
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required().label("Confirm Password")   
});

module.exports = { userSignupValidator, userLoginValidator, verifyOtpValidator, resendOtpValidator,
forgotPasswordValidator, verifyResetPasswordOTPValidator, resetPasswordValidator };