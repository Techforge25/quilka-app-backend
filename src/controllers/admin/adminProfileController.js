const { profileEvent } = require("../../events/admin/profileEvent");
const Admin = require("../../models/adminModel");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validatePayload = require("../../utils/validatePayload");
const { updateUsernameValidator } = require("../../validators/adminProfileValidator");

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

module.exports = { updateUsername };