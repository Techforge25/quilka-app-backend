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
const rateLimit = (totalAttempts = 10, minutes = 1, message = "Too many requests!") => {
    return asyncHandler(async (request, response, next) => {
        // Get IP (IPv4) & API url
        const ip = request.headers["x-real-ip"] || request.ip;
        const url = request.url;
        const key = `rateLimit:${ip.replaceAll(":", "-")}:${url}`;

        // Attempts
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * minutes); // 1 minute
        if(attempts > totalAttempts)
        {
            // Get ttl
            const ttl = await redis.ttl(key);
            const remainingMinutes = Math.ceil(ttl / 60);

            throw new ApiError(429, `${message} Please try again after ${remainingMinutes} ${remainingMinutes > 1 ? "minutes" : "minute"}.`);
        }

        return next();
    });
};

module.exports = { limitRequest, rateLimit };