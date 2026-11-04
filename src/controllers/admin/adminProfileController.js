const ApiError = require("../../utils/ApiError");
const { profileEvent } = require("../../events/admin/profileEvent");
const Admin = require("../../models/adminModel");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validatePayload = require("../../utils/validatePayload");
const { updateUsernameValidator, updateAdminPasswordValidator } = require("../../validators/adminProfileValidator");

// Update username
const updateUsername = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Sanitize payload
    const { username } = validatePayload(updateUsernameValidator, request.body) || {};

    // Trigger event for updation
    profileEvent.emit("updateUsername", { adminId, username });

    // Response
    return response.status(200).json(new ApiResponse(200, username, "Username has been updated"));
});

// Update password
const updatePassword = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Sanitize payload
    const { currentPassword, newPassword } = validatePayload(updateAdminPasswordValidator, request.body) || {};

    // Find admin
    const admin = await Admin.findById(adminId);
    if(!admin) throw new ApiError(404, "Admin not found");

    // Match current and new passwords
    const [matchCurrentPassword, matchNewPassword] = await Promise.all([
        admin.matchPassword(currentPassword),
        admin.matchPassword(newPassword)
    ]);

    // Validate
    if(!matchCurrentPassword) throw new ApiError(400, "Invalid current password");
    if(matchNewPassword) throw new ApiError(400, "New password cannot be the same as previous password");

    // Update
    Object.assign(admin, { password: newPassword });
    await admin.save();
 
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin password has been updated"));    
});

module.exports = { updateUsername, updatePassword };