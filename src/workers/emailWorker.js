const { Worker } = require("bullmq");
const { redisConfigOptions } = require("../redis/connection");
const sendEmail = require("../service/email");
const fs = require("fs");
const path = require("path");

// Email Worker
const worker = new Worker("emailQueue", async (job) => {
    // Send OTP Email
    if(job.name === "signupOTP")
    {
        const { fullName, email, accountVerificationToken } = job.data;
              
        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/signupOTPEmail.html"), "utf-8");

        // Replace placeholders
        const filledHtml = html
        .replaceAll('{{fullName}}', fullName)
        .replaceAll('{{email}}', email)
        .replaceAll('{{accountVerificationToken}}', accountVerificationToken);     

        // Execute
        const result = await sendEmail(email, "Account Activation Code", filledHtml);
        if(!result) throw new Error("Failed to send OTP email");
    }

    // Send forgot password email
    if(job.name === "sendForgotPasswordEmail")
    {
        const { fullName, email, resetPasswordOTP } = job.data;

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/forgotPasswordEmail.html"), "utf-8");

        // Replace placeholders
        const filledHtml = html
        .replaceAll('{{fullName}}', fullName)
        .replaceAll('{{email}}', email)
        .replaceAll('{{resetPasswordOTP}}', resetPasswordOTP);

        // Execute
        const result = await sendEmail(email, "Password Reset Request", filledHtml);
        if(!result) throw new Error("Failed to send password reset email");
    }

    // Send Reset password email
    if(job.name === "sendSupportEmail")
    {
        const { email, subject, category, body, attachment } = job.data;

        // Prepare attachment
        const attachments = [];
        if(attachment)
        {
            attachments.push({
                filename: attachment.originalname,
                content: Buffer.from(attachment.buffer.data),
                contentType: attachment.mimetype
            });
        }

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/supportEmail.html"), "utf-8");

        // Replace placeholders
        const filledHtml = html
        .replaceAll('{{email}}', email)
        .replaceAll('{{subject}}', subject)
        .replaceAll('{{category}}', category)
        .replaceAll('{{body}}', body);

        // Send email to admin
        await sendEmail("fullstackdev556@gmail.com", subject, filledHtml, attachments);
    }     
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));