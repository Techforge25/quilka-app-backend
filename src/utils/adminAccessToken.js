const { sign, verify, JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");
const ApiError = require("./ApiError");
const { tokenTypes } = require("../constants");
const { ADMIN_ACCESS_TOKEN_SECRET, ADMIN_ACCESS_TOKEN_EXPIRY, ADMIN_REFRESH_TOKEN_SECRET, ADMIN_REFRESH_TOKEN_EXPIRY } = process.env;

// Generate admin access token
const generateAdminAuthToken = (payload, tokenType) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    if(!tokenType) throw new ApiError(500, "Auth token type is not configured");
    if(!tokenTypes.includes(tokenType)) throw new ApiError(500, "Invalid auth token type");

    // Configure token secret & expiry
    const secret = tokenType === "access" ? ADMIN_ACCESS_TOKEN_SECRET : ADMIN_REFRESH_TOKEN_SECRET;
    const tokenExpiry = tokenType === "access" ? ADMIN_ACCESS_TOKEN_EXPIRY : ADMIN_REFRESH_TOKEN_EXPIRY;
    try 
    {
        return sign({
            _id: payload._id,
        }, secret, { expiresIn: tokenExpiry });
    } 
    catch(error) 
    {
        throw new ApiError(500, `Failed to generate ${tokenType} token. ${error.message}`);
    }
};

// Get admin auth token
const getAdminAuthToken = (request, cookieName) => {
    if(!request) throw new ApiError(500, "Request object is required");
    if(!cookieName) throw new ApiError(500, "Please specify cookie name in admin auth token function");
    try
    {
        return request.signedCookies?.[cookieName] || request.cookies?.[cookieName] || null;
    }
    catch(error)
    {
        console.log("Failed to extract admin auth token", error.message);
        return null;
    }
};

// Verify admin auth token
const verifyAdminAuthToken = (token, tokenType) => {
    if(!tokenType) throw new ApiError(500, "Auth token type is not configured");
    if(!tokenTypes.includes(tokenType)) throw new ApiError(500, "Invalid auth token type");
    if(!token) throw new ApiError(401, `Unauthorized! ${tokenType} token is missing`);

    // Configure token secret
    const secret = tokenType === "access" ? ADMIN_ACCESS_TOKEN_SECRET : ADMIN_REFRESH_TOKEN_SECRET;
    try 
    {
        return verify(token, secret);
    } 
    catch(error) 
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, `Unauthorized! ${tokenType} token has expired`);
        if(error instanceof JsonWebTokenError) throw new ApiError(401, `Unauthorized! Invalid ${tokenType} token`);
        throw new ApiError(500, `Failed to verify admin ${tokenType} token. ${error.message}`);
    }
};

module.exports = { generateAdminAuthToken, getAdminAuthToken, verifyAdminAuthToken };