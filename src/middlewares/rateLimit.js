const rateLimiter = require('express-rate-limit');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { redis } = require('../redis/connection');

// Limit the requests
const limitRequest = ({ minutes = 1, maxRequests = 10, message = "Too many requests, please try again later" }) => {
    const limiter = rateLimiter({
        windowMs: 1000 * 60 * minutes,
        max: maxRequests, // Max requests per IP per window
        handler: () => {
            throw new ApiError(429, message);
        }
    });
    return limiter;
};

// Redis rate limiter
const rateLimit = asyncHandler((totalAttempts = 10, minutes = 1) => {
    return async (request, response, next) => {
        // Get IP (IPv4)
        const ip = request.headers["x-real-ip"];
        const key = `rateLimit:${ip}`;

        // Attempts
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * minutes); // 1 minute
        if(attempts > totalAttempts) throw new ApiError(429, "Too many requests!");

        return next();
    };
});

module.exports = { limitRequest, rateLimit };