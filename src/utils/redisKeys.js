// Get otp key
const getOTPKey = (email) => `otp:${email}`;

// Get otp key
const getCancelSubscriptionOTPKey = (userId) => `cancelSubscriptionOTP:${userId}`;

// Get otp key
const getResetPasswordKey = (email) => `resetPassword:${email}`;

// Get user session key
const getUserSessionKey = (jwtid) => `userSession:${jwtid}`;

module.exports = { getOTPKey, getResetPasswordKey, getCancelSubscriptionOTPKey, getUserSessionKey };