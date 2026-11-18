const { sign, verify, JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY } = process.env;
const crypto = require("crypto");
const { getCache } = require("../redis/redisHelpers");
const { getRefreshTokenKey } = require("./redisKeys")
const ApiError = require("./ApiError");
const { tokenState } = require("../constants");

// Generate access token
const generateAccessToken = (payload, sessionId = crypto.randomUUID()) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    if(!sessionId) throw new ApiError(500, `Session ID is missing`);
    try
    {
        // Sign token
        const accessToken = sign({
            _id: payload._id,
            fullName: payload.fullName,
            role: payload.role,
            tokenType: "access"
        }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, jwtid: sessionId });

        return accessToken;
    } 
    catch(error) 
    {
        throw new ApiError(500, `Failed to generate access token. ${error.message}`);
    }
};

// Verify access token
const verifyAccessToken = (accessToken) => {
    if(!accessToken) throw new ApiError(401, "Unauthorized! Access token is missing", { state: tokenState.missing });
    try
    {
        return verify(accessToken, ACCESS_TOKEN_SECRET);
    } 
    catch(error)
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, "Unauthorized! Access token has expired", { state: tokenState.expired });
        if(error instanceof JsonWebTokenError) throw new ApiError(401, "Unauthorized! Invalid access token", { state: tokenState.invalid });
        throw new ApiError(500, `Failed to verify access token. ${error.message}`, { state: tokenState.unknown });
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
        if(!scheme || String(scheme).toLowerCase() !== "bearer") throw new ApiError(401, "Invalid token scheme");
        return token ? token : null;
    }
    catch(error)
    {
        throw new ApiError(500, `Failed to get bearer token. ${error.message}`);
    }
};

// Generate refresh token
const generateRefreshToken = (payload, sessionId = crypto.randomUUID()) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    if(!sessionId) throw new ApiError(500, `Session ID is missing`);
    try
    {
        // Sign token
        const refreshToken = sign({
            _id: payload._id,
            tokenType: "refresh"
        }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY, jwtid: sessionId });

        return refreshToken;
    } 
    catch(error) 
    {
        throw new ApiError(500, `Failed to generate refresh token. ${error.message}`);
    }
};

// Verify refresh token
const verifyRefreshToken = (refreshToken) => {
    if(!refreshToken) throw new ApiError(401, "Unauthorized! Refresh token is missing", { state: tokenState.missing });
    try
    {
        return verify(refreshToken, REFRESH_TOKEN_SECRET);
    } 
    catch(error)
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, "Unauthorized! Refresh token has expired", { state: tokenState.expired });
        if(error instanceof JsonWebTokenError) throw new ApiError(401, "Unauthorized! Invalid refresh token", { state: tokenState.invalid });
        throw new ApiError(500, `Failed to verify refresh token. ${error.message}`, { state: tokenState.unknown });
    }
};

// Get refresh token
const getRefreshToken = async (sessionId) => {
    if(!sessionId) throw new ApiError(500, "Session ID is missing");
    try
    {
        const refreshToken = await getCache(getRefreshTokenKey(sessionId));
        return refreshToken ? refreshToken : null;
    }
    catch(error)
    {
        throw new ApiError(500, `Failed to get refresh token. ${error.message}`);
    }
};

module.exports = { 
    generateAccessToken, verifyAccessToken, getBearerToken, 
    generateRefreshToken, verifyRefreshToken, getRefreshToken
};