const User = require("../models/userModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { updateInfoValidator, updatePasswordValidator, supportEmailValidator, 
deleteAccountValidator } = require("../validators/profileValidator");
const emailQueue = require("../queues/emailQueue");
const { getCache, setCache, deleteCacheByPattern, getAndDeleteCache } = require("../redis/redisHelpers");
const generateCode = require("../utils/generateCode");

// View personal info
const viewPersonalInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const key = `users:${userId}:viewPersonalInfo`;

    // Get from cache
    let user = await getCache(key);
    if(!user)
    {
        // Get from DB
        user = await User.findById(userId).select("-_id fullName email").lean();
        if(!user) throw new ApiError(404, "User not found");
        await setCache(key, user, 20);
    }

    // Repsonse
    return response.status(200).json(new ApiResponse(200, user, "Personal info has been fetched"));
});

// Update personal info
const updateInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { fullName } = validatePayload(updateInfoValidator, request.body) || {};

    // Update
    User.findByIdAndUpdate(userId, { $set: { fullName } })
    .catch(error => console.log("Failed to update personal info:", error));

    // Delete cache
    deleteCacheByPattern(`users:${userId}*`)
    .catch(error => console.log("Failed to delete user cache:", error));

    // Response
    return response.status(200).json(new ApiResponse(200, fullName, "Personal info has been updated"));
});

// Update password
const updatePassword = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { currentPassword, newPassword } = validatePayload(updatePasswordValidator, request.body) || {};

    // Find user
    const user = await User.findById(userId).select("password gid appleId");
    if(!user) throw new ApiError(404, "User not found");
    if(user.gid) throw new ApiError(403, "You cannot update password for Google-Linked accounts");
    if(user.appleId) throw new ApiError(403, "You cannot update password for Apple-Linked accounts");

    // Check current password
    const compare = await user.matchPassword(currentPassword);
    if(!compare) throw new ApiError(400, "Invalid current password");

    // Prevent restting new password as old password
    const isMatched = await user.matchPassword(newPassword);
    if(isMatched) throw new ApiError(400, "Your new password cannot be the same as your previous password");

    // Save to db
    user.password = newPassword;
    await user.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Password has been updated"));
});

// Send support email
const sendSupportEmail = asyncHandler(async (request, response) => {
    // Sanitize payload
    const { email, subject, category, body } = validatePayload(supportEmailValidator, request.body) || {};

    // Get attachment
    const attachment = request.file;

    // Add in queue
    await emailQueue.add("sendSupportEmail", { email, subject, category, body, attachment });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Your support request has been submitted successfully"));
});

// Delete account (Step: 01)
const deleteAccount = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize payload
    const { reason } = validatePayload(deleteAccountValidator, request.body) || {};

    // Find user
    const user = await User.findById(userId).select("fullName email status").lean();
    if(!user) throw new ApiError(404, "User not found");
    if(user.status !== "active") throw new ApiError(403, "Only active users can request account deletion");

    // Generate OTP token
    const { code: otp } = generateCode(6);
    if(!otp) throw new ApiError(500, "Failed to generate OTP");

    // Store in redis
    const store = await setCache(`accounts:deletion:${userId}:otp:${otp}`, { otp, reason }, 5);
    if(!store) throw new ApiError(500, "Failed to store OTP in redis");

    // Enqueue
    await emailQueue.add("accountDeletionVerification", { ...user, otp });

    // Response
    return response.status(200).json(new ApiResponse(200, { reason }, "An OTP has been generated and sent to your email address"));
});

// Confirm delete account (Step: 02)
const confirmDeleteAccount = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { otp } = request.params;

    // Get & delete stored otp
    const storedOTP = await getAndDeleteCache(`accounts:deletion:${userId}:otp:${otp}`);
    if(!storedOTP) throw new ApiError(400, "Invalid or expired OTP");

    // Delete all sessions
    await deleteCacheByPattern(`refreshToken:${userId}*`);

    // Update
    const result = await User.updateOne(
        { _id: userId, status: "active" },
        { $set: { status: "suspended", "statusTimestamps.suspendedAt": new Date() } }
    );
    if(result.modifiedCount === 0) throw new ApiError(409, "Unable to process account deletion request");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Your account has been suspended and is scheduled for permanent deletion in 30 days"));
});

module.exports = { viewPersonalInfo, updateInfo, updatePassword, sendSupportEmail, 
deleteAccount, confirmDeleteAccount };