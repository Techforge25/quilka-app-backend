const { Router } = require("express");
const { signup, login, logout, forgotPassword, verifyResetpasswordOTP, 
resetPassword, googleLogin, verifyOTP, resendOTPToken, authMe, authStatus } = require("../controllers/authController");
const { authentication } = require("../middlewares/auth");
const passport = require("passport");
const limitRequest = require("../middlewares/rateLimit");

// Router instance
const authRouter = Router();

// Signup
authRouter.route("/signup").post(signup);

// Resend OTP token
authRouter.route("/resend-otp")
.post(limitRequest({ minutes: 1, maxRequests: 1, message: "Please wait 1 minute for next otp request" }), resendOTPToken);

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
authRouter.route("/forgotPassword").post(forgotPassword);

// Reset password otp verification
authRouter.route("/verifyResetPasswordOTP").post(verifyResetpasswordOTP);

// Reset password
authRouter.route("/resetPassword").post(resetPassword);

// Login as google
authRouter.route('/google').get(passport.authenticate('google', { scope: ['profile', 'email'], prompt: "select_account" }));
authRouter.route('/google/callback').get(passport.authenticate('google', 
{ session: false, failureRedirect: `frontendDomain/login` }), googleLogin);

module.exports = authRouter;