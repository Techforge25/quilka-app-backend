const { sign, verify, JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");
const ApiError = require("./ApiError");
const { ADMIN_ACCESS_TOKEN_SECRET, ADMIN_ACCESS_TOKEN_EXPIRY, ADMIN_REFRESH_TOKEN_SECRET, ADMIN_REFRESH_TOKEN_EXPIRY } = process.env;

// Generate admin access token
const generateAdminAccessToken = (payload) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    try 
    {
        // For normal admin
        return sign({
            _id: payload._id,
        }, ADMIN_ACCESS_TOKEN_SECRET, { expiresIn: ADMIN_ACCESS_TOKEN_EXPIRY });
    } 
    catch(error) 
    {
        throw new ApiError(500, `Failed to generate access token. ${error.message}`);
    }
};

// Verify admin access token
const verifyAdminAccessToken = (accessToken) => {
    if(!accessToken) throw new ApiError(401, "Unauthorized! Access token is missing");
    try 
    {
        return verify(accessToken, ADMIN_ACCESS_TOKEN_SECRET);
    } 
    catch(error) 
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, "Unauthorized! Access token has expired");
        if(error instanceof JsonWebTokenError) throw new ApiError(401, "Unauthorized! Invalid access token");
        throw new ApiError(500, `Failed to verify admin access token. ${error.message}`);
    }
};

// Get admin access token
const getAdminAccessToken = (request) => {
    if(!request) return null;
    try
    {
        const accessToken = request.signedCookies?.adminAccessToken || request.cookies?.adminAccessToken;
        return accessToken;
    }
    catch(error)
    {
        console.log("Failed to extract admin access token", error.message);
        return null;
    }
};

// Generate admin refresh token
const generateAdminRefreshToken = (payload) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    try 
    {
        return sign({
            _id: payload._id,
        }, ADMIN_REFRESH_TOKEN_SECRET, { expiresIn: ADMIN_REFRESH_TOKEN_EXPIRY });
    } 
    catch(error) 
    {
        throw new ApiError(500, `Failed to generate refresh token. ${error.message}`);
    }
};

// Verify admin refresh token
const verifyAdminRefreshToken = (refreshToken) => {
    if(!refreshToken) throw new ApiError(401, "Unauthorized! Refresh token is missing");
    try 
    {
        return verify(refreshToken, ADMIN_REFRESH_TOKEN_SECRET);
    } 
    catch(error) 
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, "Unauthorized! Refresh token has expired");
        if(error instanceof JsonWebTokenError) throw new ApiError(401, "Unauthorized! Invalid refresh token");
        throw new ApiError(500, `Failed to verify admin refresh token. ${error.message}`);
    }
};

// Get admin refresh token
const getAdminRefreshToken = (request) => {
    if(!request) return null;
    try
    {
        const refreshToken = request.signedCookies?.adminRefreshToken || request.cookies?.adminRefreshToken;
        return refreshToken;
    }
    catch(error)
    {
        console.log("Failed to extract admin refresh token", error.message);
        return null;
    }
};

module.exports = { 
    generateAdminAccessToken, verifyAdminAccessToken, getAdminAccessToken,
    generateAdminRefreshToken, verifyAdminRefreshToken, getAdminRefreshToken
};