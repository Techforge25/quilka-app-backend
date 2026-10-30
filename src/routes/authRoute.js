const { Router } = require("express");
const { signup, login, logout, forgotPassword, verifyResetpasswordOTP, 
resetPassword, googleLogin, googleLoginCodeExchange, verifyOTP, resendOTPToken, 
authMe, authStatus } = require("../controllers/authController");
const { authentication } = require("../middlewares/auth");
const { rateLimit } = require("../middlewares/rateLimit");
const { googleAuthInit, googleAuthCallback } = require("../service/social-auth");
const { appleAuthInit, appleLogin } = require("../controllers/authController");

// Router instance
const authRouter = Router();

// Signup
authRouter.route("/signup").post(signup);

// Resend OTP token
authRouter.route("/resend-otp").post(rateLimit(3, 1), resendOTPToken);

// Account activation
authRouter.route("/verify-otp").post(verifyOTP);

// Login
authRouter.route("/login").post(login);

// Auth me
authRouter.route("/me").get(authentication, authMe);

// Auth status for login page
authRouter.route("/status").get(authStatus);

// Logout
authRouter.route("/logout").get(authentication, logout);

// Forgot password
authRouter.route("/forgotPassword").post(rateLimit(5, 10, "Too many password reset requests!"), forgotPassword);

// Reset password otp verification
authRouter.route("/verifyResetPasswordOTP").post(verifyResetpasswordOTP);

// Reset password
authRouter.route("/resetPassword").post(resetPassword);

// Login as google
authRouter.route('/google').get(googleAuthInit);
authRouter.route('/google/callback').get(googleAuthCallback, googleLogin);
authRouter.route('/google/exchange').post(rateLimit(10, 1), googleLoginCodeExchange);

// Login as Apple
authRouter.route("/apple")
.get(rateLimit(10, 1), appleAuthInit)
.post(rateLimit(10, 1), appleLogin);

module.exports = authRouter;