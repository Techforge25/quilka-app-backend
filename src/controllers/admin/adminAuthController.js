const { cookieOptions, adminFrontendURL: redirectURL, superAdminId } = require("../../constants");
const Admin = require("../../models/adminModel");
const { redis } = require("../../redis/connection");
const { generateAdminAccessToken, verifyAdminAccessToken, getAdminAccessToken,
generateAdminRefreshToken, verifyAdminRefreshToken, getAdminRefreshToken } = require("../../utils/adminAccessToken");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validatePayload = require("../../utils/validatePayload");
const { adminLoginValidator } = require("../../validators/adminAuthValidator");

// Admin login
const adminLogin = asyncHandler(async (request, response) => {
    // Get validated payload
    const { username, password } = validatePayload(adminLoginValidator, request.body);

    // Get IP (IPv4)
    const ip = request.headers["x-real-ip"];
    const key = `failedAdminLoginAttempts:${ip}`;

    // Check total attempts
    const totalAttempts = await getCache(key);
    if(totalAttempts >= 5) throw new ApiError(429, "Too many failed login attempts. Please try again after 5 minutes");    

    // Find admin
    const admin = await Admin.findOne({ username });
    if(!admin)
    {
        // Mark failed attempt
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * 5);
        throw new ApiError(400, "Invalid username or password");
    }

    // Match password
    const isMatched = await admin.matchPassword(password);
    if(!isMatched)
    {
        // Mark failed attempt
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * 5);
        throw new ApiError(400, "Invalid username or password");
    }

    // Check activeness
    if(admin.status !== "active") 
    {
        // Mark failed attempt
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * 5);     
        throw new ApiError(400, "Your account has been disabled. Please contact support for assistance.");        
    }

    // Generate access & refresh tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Validate tokens
    if(!accessToken) throw new ApiError(500, "Failed to generate admin access token");
    if(!refreshToken) throw new ApiError(500, "Failed to generate admin refresh token");

    // Save refresh token in db
    admin.refreshToken = refreshToken;
    await admin.save();

    // Prepare payload
    const payload = {
        username: admin.username, 
        role: admin.role
    };

    // Allowed modules key for normal admin
    if(String(admin._id) !== superAdminId) payload.allowedModules = admin.allowedModules;

    // Response
    return response.status(200)
    .cookie("adminAccessToken", accessToken, cookieOptions)
    .cookie("adminRefreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, payload, "Admin login successful"));
});

// Auth me (Auth check)
const authMe = asyncHandler(async (request, response) => {
    const { _id: adminId, allowedModules } = request.admin;

    // Dynamic role
    const role = adminId === superAdminId ? "superAdmin" : request.admin.role;

    // Response
    return response.status(200).json(new ApiResponse(200, { role, allowedModules }, "Authenticated"));
});

// Refresh token
const adminRefreshToken = asyncHandler(async (request, response) => {
    // Get token
    const token = getAdminRefreshToken(request);
    if(!token)
    {
        return response.status(401)
        .clearCookie("adminAccessToken", cookieOptions)
        .clearCookie("adminRefreshToken", cookieOptions)
        .json(new ApiResponse(401, { redirectURL }, "Unauthorized! Refresh token is missing"));         
    }

    // Verify refresh token
    const payload = verifyAdminRefreshToken(token);
    if(!payload)
    {
        return response.status(401)
        .clearCookie("adminAccessToken", cookieOptions)
        .clearCookie("adminRefreshToken", cookieOptions)
        .json(new ApiResponse(401, { redirectURL }, "Unauthorized! Invalid refresh token"));         
    }

    // Find admin
    const admin = await Admin.findById(payload._id);
    if(!admin)
    {
        return response.status(401)
        .clearCookie("adminAccessToken", cookieOptions)
        .clearCookie("adminRefreshToken", cookieOptions)
        .json(new ApiResponse(401, { redirectURL }, "Admin not found associated with the provided refresh token"));       
    }

    // Compare tokens
    if(admin.refreshToken !== token)
    {
        return response.status(401)
        .clearCookie("adminAccessToken", cookieOptions)
        .clearCookie("adminRefreshToken", cookieOptions)
        .json(new ApiResponse(401, { redirectURL }, "Refresh token mismatch"));         
    }

    // Generate tokens
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Validate
    if(!accessToken) throw new ApiError(400, "Failed to re-generate admin access token");
    if(!refreshToken) throw new ApiError(400, "Failed to re-generate admin refresh token");

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

// Auth status
const authStatus = asyncHandler(async (request, response) => {
    // Get token
    const adminAccessToken = getAdminAccessToken(request);
    if(!adminAccessToken) return response.status(200).json(new ApiResponse(200, { isLoggedIn: false }, "No login session found!"));
    
    // Verify
    const admin = verifyAdminAccessToken(adminAccessToken);
    if(!admin) return response.status(200).json(new ApiResponse(200, { isLoggedIn: false }, "No login session found!"));

    // Prepare payload
    const payload = {
        role: String(admin._id) === superAdminId ? "superAdmin" : admin.role,
    };
    if(String(admin._id) !== superAdminId) payload.allowedModules = admin.allowedModules;
    
    // Response
    return response.status(200).json(new ApiResponse(200, { isLoggedIn: true, ...payload }, "Login session found"));    
});

module.exports = { adminLogin, authMe, adminRefreshToken, adminLogout, authStatus };