const { isValidObjectId } = require("mongoose");
const User = require("../models/userModel");
const { getBearerToken, getRefreshToken, verifyRefreshToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const validatePayload = require("../utils/validatePayload");
const { userSignupValidator, userLoginValidator, verifyOtpValidator, resendOtpValidator, 
forgotPasswordValidator, verifyResetPasswordOTPValidator, resetPasswordValidator, 
appleLoginValidator } = require("../validators/userAuthValidator");
const { setCache, getCache, deleteCache, getAndDeleteCache } = require("../redis/redisHelpers");
const { getOTPKey, getResetPasswordKey, getRefreshTokenKey } = require("../utils/redisKeys");
const emailQueue = require("../queues/emailQueue");
const crypto = require("crypto");
const { verifyAppleIdentityToken } = require("../service/apple-auth");
const { ACCESS_TOKEN_SECRET } = process.env;
const { verify, TokenExpiredError, JsonWebTokenError } = require("jsonwebtoken");
const { tokenState } = require("../constants");

// Signup
const signup = asyncHandler(async (request, response) => {
    // Validate
    const { fullName, email, password } = validatePayload(userSignupValidator, request.body) || {};

    // Check if email exist
    const user = await User.findOne({ email }).select("_id email status").lean();
    if(user)
    {
        if(user.status === "pending")
        {
            return response.status(400)
            .json(new ApiResponse(400, { otpRequired: true, userId: user._id }, "Your account is not activated yet. Please verify your identity via OTP."));
        }
        else
        {
            throw new ApiError(409, "This email has already been taken");
        }
    }

    // Generate OTP token
    const { code: accountVerificationToken } = generateCode(6);
    if(!accountVerificationToken) throw new ApiError(500, "Failed to generate OTP");

    // Create user
    const createUser = await User.create({ fullName, email, password });
    if(!createUser) throw new ApiError(500, "Failed to signup");  
    
    // Store in redis
    await setCache(getOTPKey(email), accountVerificationToken, 10);

    // Send email in backgrouund
    await emailQueue.add("signupOTP", { fullName, email, accountVerificationToken });

    // Response
    return response.status(200)
    .json(new ApiResponse(200, { otpRequired: true, userId: createUser._id }, "Signup successful! We have sent you an OTP to your email"));     
});

// Resend OTP token for account verification
const resendOTPToken = asyncHandler(async (request, response) => {
    const { email } = validatePayload(resendOtpValidator, request.body) || {};

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.status !== "pending") throw new ApiError(400, "Your account is already activated");

    // Generate new OTP token
    const { code: accountVerificationToken } = generateCode(6);
    if(!accountVerificationToken) throw new ApiError(500, "Failed to generate OTP");

    // Store OTP in redis
    await setCache(getOTPKey(email), accountVerificationToken, 10);

    // Send email in backgrouund
    await emailQueue.add("signupOTP", { fullName: user.fullName, email, accountVerificationToken }); 

    // Response
    return response.status(200).json(new ApiResponse(200, { userId: user._id }, "We have re-sent you an OTP to your email"));         
});

// Verify OTP
const verifyOTP = asyncHandler(async (request, response) => {
    const { userId, accountVerificationToken } = validatePayload(verifyOtpValidator, request.body) || {};

    // Validate
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");

    // Find user
    const user = await User.findById(userId);
    if(!user) throw new ApiError(404, "User not found!");

    // Get and delete OTP from redis
    const otp = await getAndDeleteCache(getOTPKey(user.email));

    // Validate
    if(!otp) throw new ApiError(400, "Invalid OTP");
    if(otp !== accountVerificationToken) throw new ApiError(400, "Invalid OTP");

    // Save to db
    user.status = "active";
    await user.save();

    // Response
    return response.status(200).json(new ApiResponse(200, user.email, "Your account has been activated"));
});

// Login
const login = asyncHandler(async (request, response) => {
    // Get validated payload
    const { email, password } = validatePayload(userLoginValidator, request.body) || {};

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(400, "Invalid email or password");

    // Match password
    const isMatched = await user.matchPassword(password);
    if(!isMatched) throw new ApiError(400, "Invalid email or password");

    // Only approved account can log in
    if(user.status === "pending") return response.status(403).json(new ApiResponse(403, { otpRequired: true, userId: user._id }, "Please verify your identity via OTP."));
    if(user.status === "suspended") throw new ApiError(400, "Your account is not eligible for login");

    // Generate auth tokens
    const { accessToken, refreshToken } = await user.generateAuthTokens();

    // Response
    return response.status(200).json(new ApiResponse(200, { accessToken, refreshToken }, "Login successful"));
});

// User auth check
const authMe = asyncHandler(async (request, response) => {
    const { _id: userId } = request.user;

    // Response
    return response.status(200).json(new ApiResponse(200, { userId }, "Authenticated!"));
});

// Auth status for login page rendering
const authStatus = asyncHandler(async (request, response) => {
    const accessToken = getBearerToken(request);
    if(!accessToken) return response.status(200).json(new ApiResponse(200, { isLoggedIn: false }, "No login session found!"));

    // Verify
    const user = verify(accessToken, ACCESS_TOKEN_SECRET);
    if(!user) return response.status(200).json(new ApiResponse(200, { isLoggedIn: false }, "No login session found!"));

    // Response
    return response.status(200).json(new ApiResponse(200, { isLoggedIn: true }, "Login session found")); 
});

// Refresh token
const refreshToken = asyncHandler(async (request, response) => {
    try
    {
        // Get access token
        const accessToken = getBearerToken(request);
        if(!accessToken) throw new ApiError(401, "Unauthorized! Access token is missing");

        // Extract Session ID
        const { _id: userId, jti: sessionId } = verify(accessToken, ACCESS_TOKEN_SECRET, { ignoreExpiration: true }) || {};
        if(!userId) throw new ApiError(401, "Unauthorized! User ID is missing");
        if(!sessionId) throw new ApiError(401, "Unauthorized! Session ID is missing");
        
        // Get refresh token
        const refreshToken = await getRefreshToken(sessionId);
        if(!refreshToken) throw new ApiError(401, "Unauthorized! Refresh token not found associated with the session");

        // Verify refresh token
        const { _id, jti } = verifyRefreshToken(refreshToken) || {};
        if(String(_id) !== String(userId)) throw new ApiError(401, "Unauthorized! User ID mismatch");
        if(String(jti) !== String(sessionId)) throw new ApiError(401, "Unauthorized! Session ID mismatch");

        // Find user
        const user = await User.findById(userId).select("fullName role status");
        if(!user) throw new ApiError(401, "Unauthorized! User not found associated with the refresh token");
        if(user.status !== "active") throw new ApiError(401, "Unauthorized! Your account temporarily suspended");

        // Parallel execution
        const [tokens, deleteOldCache] = await Promise.all([
            // Generate new tokens
            user.generateAuthTokens(),

            // Delete old refresh token
            deleteCache(getRefreshTokenKey(sessionId))
        ]);
        if(!deleteOldCache) throw new ApiError(500, "Failed to clear old refresh token");

        // Response
        return response.status(200).json(new ApiResponse(200, { accessToken: tokens.accessToken }, "Auth tokens have been refreshed"));
    }
    catch(error)
    {
        if(error instanceof TokenExpiredError) throw new ApiError(401, "Unauthorized! Access token has expired", { state: tokenState.expired });
        if(error instanceof JsonWebTokenError) throw new ApiError(401, "Unauthorized! Invalid access token", { state: tokenState.invalid });
        throw error;
    }
});

// Logout
const logout = asyncHandler(async (request, response) => {
    // Delete session from redis
    await deleteCache(getRefreshTokenKey(request.user.jti));

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

// Forgot password
const forgotPassword = asyncHandler(async (request, response) => {
    // Get validated payload
    const { email } = validatePayload(forgotPasswordValidator, request.body) || {};

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.gid) throw new ApiError(403, "OTP verification is not available for Google-linked accounts.");
    if(user.appleId) throw new ApiError(403, "OTP verification is not available for Apple-linked accounts.");

    // Generate a reset password OTP
    const { code: resetPasswordOTP } = generateCode(6);
    if(!resetPasswordOTP) throw new ApiError(500, "Failed to generate password reset token");

    // Store token in redis
    await setCache(getResetPasswordKey(email), resetPasswordOTP, 10); // 10 minutes

    // Send email in backgrouund
    await emailQueue.add("sendForgotPasswordEmail", { fullName: user.fullName, email, resetPasswordOTP });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Password reset token has been sent to your email"));
});

// Verify reset password OTP
const verifyResetpasswordOTP = asyncHandler(async (request, response) => {
    // Get validated payload
    const { email, resetPasswordOTP } = validatePayload(verifyResetPasswordOTPValidator, request.body) || {}; 

    // Get token from redis
    const resetToken = await getCache(getResetPasswordKey(email));

    // Validate
    if(!resetToken) throw new ApiError(400, "Invalid OTP");
    if(resetToken !== resetPasswordOTP) throw new ApiError(400, "Invalid OTP");

    // Response
    return response.status(200).json(new ApiResponse(200, resetPasswordOTP, "OTP verified successfully"));
});

// Reset password
const resetPassword = asyncHandler(async (request, response) => {
    // Get validated payload
    const { resetPasswordOTP, email, newPassword } = validatePayload(resetPasswordValidator, request.body) || {};

    // Get token from redis
    const resetToken = await getCache(getResetPasswordKey(email));

    // Validate
    if(!resetToken) throw new ApiError(400, "Your password reset session has expired. Please try again.");
    if(resetToken !== resetPasswordOTP) throw new ApiError(400, "Your password reset session has expired. Please try again");    

    // Find user associated with this email
    const user = await User.findOne({ email }).select("_id password gid appleId");
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.gid) throw new ApiError(403, "Reset password feature is not available for Google-linked accounts.");
    if(user.appleId) throw new ApiError(403, "Reset password feature is not available for Apple-linked accounts.");

    // Prevent restting password as old password
    const matchPassword = await user.matchPassword(newPassword);
    if(matchPassword) throw new ApiError(400, "Your new password cannot be the same as your previous password");

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete cache from redis
    await deleteCache(getResetPasswordKey(email));

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Password has been reset successfully"));
});

// Login as gmail
const googleLogin = asyncHandler(async (request, response) => {
    // Validate
    const user = request.user;
    if(!user) throw new ApiError(401, "Google authentication failed");
    if(user.status !== "active") throw new ApiError(403, "Your account is not eligible for login");

    // Generate one-time code
    const oneTimeCode = crypto.randomUUID();
    
    // Set on redis
    await setCache(`auth:google:code:${oneTimeCode}`, user._id, 1);

    // Redirect
    return response.status(302).redirect(`quilka:///auth/callback?code=${encodeURIComponent(oneTimeCode)}`);
});

// Google login code exchange
const googleLoginCodeExchange = asyncHandler(async (request, response) => {
    // Sanitize payload
    const { oneTimeCode } = request.body || {};
    if(!oneTimeCode) throw new ApiError(400, "One-time code is missing");

    // Retrieve and delete from cache
    const userId = await getAndDeleteCache(`auth:google:code:${oneTimeCode}`);
    if(!userId) throw new ApiError(401, "Your Google login code is invalid, expired, or has already been used. Please sign in again");
    if(!isValidObjectId(userId)) throw new ApiError(400, "Signature Failed! Invalid User ID");

    // Find user
    const user = await User.findById(userId);
    if(!user) throw new ApiError(404, "User not found");
    if(user.status !== "active") throw new ApiError(403, "Your account is not eligible for login");

    // Generate auth token
    const { accessToken } = await user.generateAuthTokens();

    // Response
    return response.status(200).json(new ApiResponse(200, { accessToken }, "Login successful"));
});

// Initialize Apple authentication
const appleAuthInit = asyncHandler(async (request, response) => {
    // Generate nonce
    const nonce = crypto.randomUUID();

    // Store nonce in Redis for 5 minutes
    await setCache(`auth:apple:nonce:${nonce}`, "pending", 5);

    // Response
    return response.status(200).json(new ApiResponse(200, { nonce }, "Apple authentication initialized"));
});

// Login as Apple
const appleLogin = asyncHandler(async (request, response) => {
    // Sanitize payload
    const { identityToken, nonce, fullName } = validatePayload(appleLoginValidator, request.body) || {};

    // Verify Apple identity token
    const applePayload = await verifyAppleIdentityToken(identityToken, nonce);

    // Retrieve and delete nonce from Redis
    const storedNonce = await getAndDeleteCache(`auth:apple:nonce:${nonce}`);
    if(!storedNonce) throw new ApiError(401, "Apple authentication request is invalid, expired, or has already been used");

    // Extract properties
    const appleId = applePayload.sub;
    const email = typeof applePayload.email === "string" ? applePayload.email.trim().toLowerCase() : "";

    // Validate apple provided fields
    if(!appleId || !email) throw new ApiError(400, "Apple did not provide the required fields");

    let accessToken;

    // Find existing Apple account
    let user = await User.findOne({ appleId });
    if(user)
    {
        // Generate access token
        const tokens = await user.generateAuthTokens();
        accessToken = tokens.accessToken;
    }
    else
    {
        // Check whether email is already registered
        user = await User.findOne({ email });
        if(user) throw new ApiError(409, "An account with this email already exists. Please sign in using your existing login method");

        // Create new user
        user = await User.create({
            appleId,
            fullName,
            email,
            appleAccount: true,
            status: "active"
        });

        // Find created user & generate auth token
        const createdUser = await User.findById(user._id);
        const tokens = await createdUser.generateAuthTokens();
        accessToken = tokens.accessToken;
    }

    // Check account status
    if(user.status !== "active") throw new ApiError(403, "Your account is not eligible for login");

    // Response
    return response.status(200).json(new ApiResponse(200, { accessToken }, "Login successful"));
});

module.exports = { signup, login, logout, forgotPassword, resendOTPToken, 
verifyOTP, verifyResetpasswordOTP, resetPassword, googleLogin, googleLoginCodeExchange, 
appleAuthInit, appleLogin, authMe, authStatus, refreshToken };