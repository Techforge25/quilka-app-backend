const rateLimiter = require('express-rate-limit');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { redis } = require('../redis/connection');

// Express rate limiter
const expressRateLimit = ({ minutes = 1, maxRequests = 10, message = "Too many requests!" }) => {
    const limiter = rateLimiter({
        windowMs: 1000 * 60 * minutes,
        max: maxRequests, // Max requests per IP per window
        handler: (request, response, next, options) => {
            // Get reset time
            const resetTime = request.rateLimit.resetTime;
            const remainingMs = resetTime ? resetTime.getTime() - Date.now() : 0;
            const remainingMinutes = Math.ceil(remainingMs / 60000);

            throw new ApiError(429, `${message} Please try again after ${remainingMinutes} ${remainingMinutes > 1 ? "minutes" : "minute"}.`);
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

module.exports = { expressRateLimit, rateLimit };