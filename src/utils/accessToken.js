const { sign, verify, JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY } = process.env;
const crypto = require("crypto");
const { getCache } = require("../redis/redisHelpers");
const { getRefreshTokenKey } = require("./redisKeys")
const ApiError = require("./ApiError");
const { tokenState, tokenTypes } = require("../constants");

// Generate auth token
const generateAuthToken = (payload, tokenType, sessionId = crypto.randomUUID()) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    if(!tokenType) throw new ApiError(500, "Auth token type is not configured");
    if(!tokenTypes.includes(tokenType)) throw new ApiError(500, "Invalid auth token type");

    // Configure token secret & expiry
    const secret = tokenType === "access" ? ACCESS_TOKEN_SECRET : REFRESH_TOKEN_SECRET;
    const tokenExpiry = tokenType === "access" ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;
    try 
    {
        // Sign token
        return sign({
            _id: payload._id,
            fullName: payload.fullName,
            role: payload.role
        }, secret, { expiresIn: tokenExpiry, jwtid: sessionId });
    } 
    catch(error)
    {
        throw new ApiError(500, `Failed to generate ${tokenType} token. ${error.message}`);
    }
};

// Get bearer token
const getBearerToken = (request) => {
    if(!request) throw new ApiError(500, "Request object is required");
    try
    {
        // Get authorization metadata
        const authorization = request.headers['authorization'];
        if(!authorization) throw new ApiError(401, "Bearer token is missing");

        // Validate
        const [scheme, token] = authorization.split(" ");
        if(!scheme || String(scheme).toLowerCase() !== "bearer") throw new ApiError(401, "Invalid bearer token");
        return token ? token : null;
    }
    catch(error)
    {
        throw error;
    }
};

// Verify auth token
const verifyAuthToken = (token, tokenType) => {
    if(!tokenType) throw new ApiError(500, "Auth token type is not configured");
    if(!tokenTypes.includes(tokenType)) throw new ApiError(500, "Invalid auth token type");
    if(!token) throw new ApiError(401, `Unauthorized! ${tokenType} token is missing`);

    // Configure token secret
    const secret = tokenType === "access" ? ACCESS_TOKEN_SECRET : REFRESH_TOKEN_SECRET;
    try 
    {
        return verify(token, secret);
    } 
    catch(error) 
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, `Unauthorized! ${tokenType} token has expired`, { state: tokenState.expired });
        if(error instanceof JsonWebTokenError) throw new ApiError(401, `Unauthorized! Invalid ${tokenType} token`, { state: tokenState.invalid });
        throw error;
    }
};

// Get stored refresh token in redis
const getStoredRefreshToken = async (sessionId, userId) => {
    if(!sessionId) throw new ApiError(500, "Session ID is missing");
    if(!userId) throw new ApiError(500, "User ID is missing in get refresh token utility");
    try
    {
        const refreshToken = await getCache(getRefreshTokenKey(sessionId, userId));
        return refreshToken ? refreshToken : null;
    }
    catch(error)
    {
        throw error;
    }
};

module.exports = { generateAuthToken, getBearerToken, verifyAuthToken, getStoredRefreshToken };