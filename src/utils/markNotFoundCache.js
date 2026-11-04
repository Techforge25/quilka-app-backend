const { getCache } = require("../redis/redisHelpers");
const ApiError = require("./ApiError");

const markNotFoundCache = async (notFoundKey) => {
    // Track not found attempts
    const attempts = await getCache(notFoundKey);
    if(attempts >= 3)
    {
        // Get ttl
        const ttl = await redis.ttl(key);
        const remainingMinutes = Math.ceil(ttl / 60);
        throw new ApiError(429, `Too many requests for non-existing data! Please try again after ${remainingMinutes} ${remainingMinutes > 1 ? "minutes" : "minute"}.`);
    } 
};

module.exports = { markNotFoundCache };