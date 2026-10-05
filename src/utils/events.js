const { EventEmitter } = require("events");
const sendEmail = require("../service/email");

// Event emitter instance
const event = new EventEmitter();

// Listen on signup otp
event.on("signupOTP", async ({ email, accountVerificationToken }) => {
    // Execute
    const result = await sendEmail(email, "Your verification code", `
        Your verification code is ${accountVerificationToken}. 
        This code is for verifying your account. If you did not request this code, you can safely ignore this email.
        Please do not reply to this automated message.
    `);
    if(!result) throw new Error("Failed to send OTP email");
});

module.exports = event;