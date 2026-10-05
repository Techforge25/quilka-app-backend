const { EventEmitter } = require("events");
const sendEmail = require("../service/email");

// Event emitter instance
const event = new EventEmitter();

// Listen on signup otp
event.on("signupOTP", async ({ email, accountVerificationToken }) => {
    console.log(`signupOTP event triggered`);

    // Execute
    const result = await sendEmail(email, "Your verification code", `
        Your verification code is ${accountVerificationToken}. 
        This code is for verifying your account. If you did not request this code, you can safely ignore this email.
        Please do not reply to this automated message.
    `);
    if(!result) return console.log("Failed to send OTP email", result);
});

// Listen on forgot password otp
event.on("sendResetPasswordEmail", async ({ email, resetPasswordOTP }) => {
    console.log(`sendResetPasswordEmail event triggered`);

    // Execute
    const result = await sendEmail(email, "Password Reset Request", `Your reset password code is ${resetPasswordOTP}`);
    if(!result) return console.log("Failed to send password reset email", result);
});

module.exports = event;