const { cookieOptions } = require("../../constants");
const Admin = require("../../models/adminModel");
const { generateAdminAccessToken, generateAdminRefreshToken, verifyAdminRefreshToken, 
getAdminRefreshToken } = require("../../utils/adminAccessToken");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validatePayload = require("../../utils/validatePayload");
const { adminLoginValidator } = require("../../validators/adminAuthValidator");

// Admin login
const adminLogin = asyncHandler(async (request, response) => {
    // Get validated payload
    const { username, password } = validatePayload(adminLoginValidator, request.body);  

    // Find admin
    const admin = await Admin.findOne({ username });
    if(!admin) throw new ApiError(400, "Invalid username or password");
    
    // Match password
    const isMatched = await admin.matchPassword(password);
    if(!isMatched) throw new ApiError(400, "Invalid username or password");      

    // Generate access & refresh tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Save refresh token in db
    admin.refreshToken = refreshToken;
    await admin.save();

    // Response
    return response.status(200)
    .cookie("adminAccessToken", accessToken, cookieOptions)
    .cookie("adminRefreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { adminId: admin._id }, "Admin login successful"));
});

// Auth me (Auth check)
const authMe = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Response
    return response.status(200).json(new ApiResponse(200, { adminId }, "Authenticated!"));
});

// Refresh access token
const adminRefreshAccessToken = asyncHandler(async (request, response) => {
    // Get & verify refresh token
    const token = getAdminRefreshToken(request);
    const payload = verifyAdminRefreshToken(token);

    // Find admin
    const admin = await Admin.findById(payload._id).select("refreshToken");
    if(!admin) throw new ApiError(401, "Admin not found associated with the provided refresh token");

    // Compare tokens
    if(admin.refreshToken !== token) throw new ApiError(401, "Unauthorized! Refresh token mismatch");

    // Generate tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Save to db
    admin.refreshToken = refreshToken;
    await admin.save(); 

    // Response
    return response.status(200)
    .cookie("adminAccessToken", accessToken, cookieOptions)
    .cookie("adminRefreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, null, "Refresh token for admin has been issued"));
});

// Admin logout
const adminLogout = asyncHandler(async (request, response) => {
    const adminId = request.admin._id;

    // Clear refresh token in db
    const admin = await Admin.findByIdAndUpdate(adminId, { $set: { refreshToken: null } });
    if(!admin) throw new ApiError(500, "Failed to clear refresh token from db");

    // Response
    return response.status(200)
    .clearCookie("adminAccessToken", cookieOptions)
    .clearCookie("adminRefreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout successful"));
});

module.exports = { adminLogin, authMe, adminRefreshAccessToken, adminLogout };