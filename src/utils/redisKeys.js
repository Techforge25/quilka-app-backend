const ApiError = require("./ApiError");

// Get otp key
const getOTPKey = (email) => `otp:${email}`;

// Get otp key
const getCancelSubscriptionOTPKey = (userId) => `cancelSubscriptionOTP:${userId}`;

// Get otp key
const getResetPasswordKey = (email) => `resetPassword:${email}`;

// Get user session key
const getUserSessionKey = (sessionId) => `userSession:${sessionId}`;

// Get my book key
const getMyBookKey = (bookId, userId) => `book:${bookId}:user:${userId}`;

// Get not found key
const getNotFoundKey = (request) => {
    if(!request) throw new ApiError(500, "Request object is required to extract IP address");
    const ip = request.ip || request.headers["x-real-ip"];
    if(!ip) throw new ApiError(500, "IP address is missing");
    if(typeof ip !== "string") throw new ApiError(500, "Invalid IP address");

    return `NotFound:${ip.replaceAll(":", "-")}`;
};

module.exports = { getOTPKey, getResetPasswordKey, getCancelSubscriptionOTPKey, 
getUserSessionKey, getMyBookKey, getNotFoundKey };