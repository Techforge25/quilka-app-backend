const { sign, verify, JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY } = process.env;
const crypto = require("crypto");
const { setCache } = require("../redis/redisHelpers");
const { getUserSessionKey } = require("./redisKeys");
const { ApiError } = require("@google/genai");

// Generate access token
const generateAccessToken = async (payload) => {
    if(!payload) throw new ApiError(500, `Payload is missing`);
    try 
    {
        // Unique Session ID
        const sessionId = crypto.randomUUID();

        // Sign token
        const accessToken = sign({
            _id: payload._id,
            fullName: payload.fullName,
            role: payload.role,
        }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, jwtid: sessionId });

        // Set session to redis
        await setCache(getUserSessionKey(sessionId), String(payload._id), 60 * 24 * 30);

        return accessToken;
    } 
    catch(error) 
    {
        throw new ApiError(500, `Failed to generate access token. ${error.message}`);
    }
};

// Verify access token
const verifyAccessToken = (accessToken) => {
    if(!accessToken) throw new ApiError(401, "Unauthorized! Access token is missing");
    try
    {
        return verify(accessToken, ACCESS_TOKEN_SECRET);
    } 
    catch(error)
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, "Unauthorized! Access token has expired");
        if(error instanceof JsonWebTokenError) throw new ApiError(401, "Unauthorized! Invalid access token");
        throw new ApiError(500, `Failed to verify access token. ${error.message}`);
    }
};

// Get access token
const getAccessToken = (request) => {
    if(!request) throw new ApiError(500, "Request object is required");
    try
    {
        const accessToken = request.headers['authorization']?.split(" ")?.[1];
        return accessToken ? accessToken : null;
    }
    catch(error)
    {
        throw new ApiError(500, `Failed to get access token. ${error.message}`);
    }
};

module.exports = { generateAccessToken, verifyAccessToken, getAccessToken };