const { Worker } = require("bullmq");
const { redisConfigOptions } = require("../redis/connection");
const sendEmail = require("../service/email");
const fs = require("fs");
const path = require("path");

// Email Worker
const worker = new Worker("emailQueue", async (job) => {
    console.log(`Email worker started`);

    // Send OTP Email
    if(job.name === "signupOTP")
    {
        const { email, accountVerificationToken } = job.data;
              
        // Get HTML template
        // const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/signupOTPEmail.html"), "utf-8");

        // Replace placeholders
        // const filledHtml = html
        // .replaceAll('{{email}}', email)
        // .replaceAll('{{accountVerificationToken}}', accountVerificationToken);     

        // Execute
        const result = await sendEmail(email, "Your verification code", `
            Your verification code is ${accountVerificationToken}. 
            This code is for verifying your account. If you did not request this code, you can safely ignore this email.
            Please do not reply to this automated message.
        `);
        if(!result) throw new Error("Failed to send OTP email");
    }

    // Send Reset password email
    if(job.name === "sendResetPasswordEmail")
    {
        const { email, resetPasswordOTP } = job.data;

        // Get HTML template
        // const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/forgotPasswordEmail.html"), "utf-8");

        // Replace placeholders
        // const filledHtml = html
        // .replaceAll('{{email}}', email)
        // .replaceAll('{{resetPasswordOTP}}', resetPasswordOTP); 

        // Execute
        const result = await sendEmail(email, "Password Reset Request", `Your reset password code is ${resetPasswordOTP}`);
        if(!result) throw new Error("Failed to send password reset email");
    }        
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));