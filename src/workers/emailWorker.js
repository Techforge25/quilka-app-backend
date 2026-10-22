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
                content: attachment.buffer,
                contentType: attachment.mimetype
            });
        }

        // Prepare email body
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333333;">
                <h2 style="color: #240457; margin-bottom: 8px;">New Support Request</h2>
                <p style="color: #666666; font-size: 14px;">A new support request has been submitted. Please review the details below.</p>

                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">

                <p><strong>From:</strong> ${email}</p>
                <p><strong>Category:</strong> ${category}</p>
                <p><strong>Subject:</strong> ${subject}</p>

                <h3 style="color: #240457; margin-top: 28px;">Message</h3>
                <div style="background-color: #f8f7fc; padding: 16px; border-radius: 8px; line-height: 1.6; white-space: pre-wrap;">${body}</div>

                <p style="font-size: 13px; color: #777777; margin-top: 24px;">
                    ${attachment ? "An attachment has been included with this request." : "No attachment was provided."}
                </p>

                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">

                <p style="font-size: 12px; color: #999999;">
                    This is an automated notification from the support system.
                </p>
            </div>
        `;

        // Send email to admin
        await sendEmail("fullstackdev556@gmail.com", subject, emailBody, attachments);
    }     
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));