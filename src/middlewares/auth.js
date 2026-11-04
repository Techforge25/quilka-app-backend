const { getAccessToken, verifyAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getCache } = require("../redis/redisHelpers");
const { getUserSessionKey } = require("../utils/redisKeys");

// Authentication
const authentication = asyncHandler(async (request, response, next) => {
    // Get & verify access token
    const accessToken = getAccessToken(request);
    const user = verifyAccessToken(accessToken);

    // Check session in redis
    const session = await getCache(getUserSessionKey(user.jti));
    if(!session) throw new ApiError(401, "Unauthorized! Session has been revoked");
    if(session !== user._id) throw new ApiError(401, "Unauthorized! Session ID mismatch");

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