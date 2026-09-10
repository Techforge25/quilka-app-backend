const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY } = process.env;
const crypto = require("crypto");
const { setCache } = require("../redis/redisHelpers");
const { getUserSessionKey } = require("./redisKeys");

// Generate access token
const generateAccessToken = async (payload) => {
    if(!payload) return null;
    try 
    {
        // Unique JWT ID
        const jwtId = crypto.randomUUID();

        // Sign token
        const accessToken = jwt.sign({
            _id: payload._id,
            fullName: payload.fullName,
            role: payload.role,
        }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, jwtid: jwtId });

        // Set session to redis
        await setCache(getUserSessionKey(jwtId), accessToken, 60 * 60);

        return accessToken;
    } 
    catch(error) 
    {
        console.log("Failed to generate access token", error.message);
        return null;
    }
};

// Verify access token
const verifyAccessToken = (accessToken) => {
    if(!accessToken) return null;
    try 
    {
        return jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    } 
    catch(error) 
    {
        console.log("Failed to verify access token", error.message);
        return null;
    }
};

// Get access token
const getAccessToken = (request) => {
    if(!request) return null;
    try
    {
        const accessToken = request.headers['authorization']?.split(" ")?.[1];
        return accessToken;
    }
    catch(error)
    {
        console.log("Failed to extract access token", error.message);
        return null;
    }
};

module.exports = { generateAccessToken, verifyAccessToken, getAccessToken };