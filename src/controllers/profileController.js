const User = require("../models/userModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const validatePayload = require("../utils/validatePayload");
const { isValidObjectId } = require("mongoose");
const { updateInfoValidator } = require("../validators/profileValidator");

// View personal info
const viewPersonalInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Fetch
    const user = await User.findById(userId).select("-_id fullName email").lean();
    if(!user) throw new ApiError(404, "User not found");

    // Repsonse
    return response.status(200).json(new ApiResponse(200, user, "Personal info has been fetched"));
});

// Update personal info
const updateInfo = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload
    const { fullName } = validatePayload(updateInfoValidator, request.body) || {};

    // Update
    const update = await User.findByIdAndUpdate(userId, { $set: { fullName } });
    if(!update) throw new ApiError(500, "Failed to update personal info");

    // Response
    return response.status(200).json(new ApiResponse(200, fullName, "Personal info has been fetched"));
});

module.exports = { viewPersonalInfo, updateInfo };