const { getAccessToken, verifyAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getCache } = require("../redis/redisHelpers");
const { getUserSessionKey } = require("../utils/redisKeys");

// Authentication
const authentication = asyncHandler(async (request, response, next) => {
    const accessToken = getAccessToken(request);
    if(!accessToken) throw new ApiError(401, "Unauthorized! Access token is missing");
    
    // Verify
    const user = verifyAccessToken(accessToken);
    if(!user) throw new ApiError(401, "Unauthorized! Invalid access token");

    // Check token in redis
    const token = await getCache(getUserSessionKey(user.jti));
    if(!token) throw new ApiError(401, "Unauthorized! Access token has been revoked");

    // Pass through
    request.user = user;
    return next();
});

// Authorization based on role
const authorization = (roles = []) => {
    return (request, response, next) => {
        if(!request.user) throw new ApiError(401, "Unauthorized!");
        if(!roles.includes(request.user.role)) throw new ApiError(403, "Access denied!");
        return next();
    }
};

module.exports = { authentication, authorization };