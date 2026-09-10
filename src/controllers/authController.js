const { isValidObjectId } = require("mongoose");
const User = require("../models/userModel");
const { generateAccessToken, verifyAccessToken, getAccessToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const validatePayload = require("../utils/validatePayload");
const { userSignupValidator, userLoginValidator, verifyOtpValidator, resendOtpValidator, 
forgotPasswordValidator, verifyResetPasswordOTPValidator, resetPasswordValidator } = require("../validators/userAuthValidator");
const { setCache, getCache, deleteCache } = require("../redis/redisHelpers");
const { getOTPKey, getResetPasswordKey, getUserSessionKey } = require("../utils/redisKeys");
const emailQueue = require("../queues/emailQueue");
const { redis } = require("../redis/connection");

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
    await setCache(getOTPKey(email), accountVerificationToken);    

    // Send email in backgrouund
    await emailQueue.add("signupOTP", { email, accountVerificationToken });

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

    // Check existing otp
    const exist = await getCache(getOTPKey(email));
    if(exist) throw new ApiError(400, "Please wait until your current OTP expires before requesting a new one");

    // Generate new OTP token
    const { code: accountVerificationToken } = generateCode(6);
    if(!accountVerificationToken) throw new ApiError(500, "Failed to generate OTP");

    // Store OTP in redis
    await setCache(getOTPKey(email), accountVerificationToken);

    // Send email in backgrouund
    await emailQueue.add("signupOTP", { email, accountVerificationToken }); 

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

    // Get OTP from redis
    const otp = await getCache(getOTPKey(user.email));

    // Validate
    if(!otp) throw new ApiError(400, "Invalid OTP");
    if(otp !== accountVerificationToken) throw new ApiError(400, "Invalid OTP");

    // Save to db
    user.status = "active";
    await user.save();

    // Delete from redis
    await deleteCache(getOTPKey(user.email));

    // Response
    return response.status(200).json(new ApiResponse(200, user.email, "Your account has been activated"));
});

// Login
const login = asyncHandler(async (request, response) => {
    // Get validated payload
    const { email, password } = validatePayload(userLoginValidator, request.body) || {};

    // Get IP (IPv4)
    const ip = request.headers["x-real-ip"];
    const key = `failedLoginAttempts:${ip}`;

    // Check total attempts
    const totalAttempts = await getCache(key);
    if(totalAttempts >= 5) throw new ApiError(429, "Too many failed login attempts. Please try again after 5 minutes");

    // Find user
    const user = await User.findOne({ email });
    if(!user) 
    {
        // Mark failed attempt
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes
        throw new ApiError(400, "Invalid email or password");
    }

    // Match password
    const isMatched = await user.matchPassword(password);
    if(!isMatched)
    {
        // Mark failed attempt
        const attempts = await redis.incr(key);
        if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes
        throw new ApiError(400, "Invalid email or password");
    }

    // Only approved account can log in
    if(user.status === "pending") return response.status(403).json(new ApiResponse(403, { otpRequired: true, userId: user._id }, "Please verify your identity via OTP."));
    if(user.status === "flagged") throw new ApiError(400, "Your account is flagged. You cannot log-in to your account");  

    // Generate access token
    const accessToken = await generateAccessToken(user);
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");

    // Delete attempts
    await deleteCache(key);

    // Response
    return response.status(200).json(new ApiResponse(200, { accessToken }, "Login successful"));
});

// Logout
const logout = asyncHandler(async (request, response) => {
    // Delete session from redis
    await deleteCache(getUserSessionKey(request.user.jti));

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

// Forgot password
const forgotPassword = asyncHandler(async (request, response) => {
    // Get validated payload
    const { email } = validatePayload(forgotPasswordValidator, request.body) || {};

    // Track attempts
    const key = `forgotPasswordEmailAttempts:${email}`;
    const attempts = await redis.incr(key);
    if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes   
    if(attempts > 1) throw new ApiError(400, "Please wait 5 minutes for next password reset request");

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.googleAccount) throw new ApiError(403, "OTP verification is not available for Google-linked accounts.");

    // Generate a reset password OTP
    const { code: resetPasswordOTP } = generateCode(6);
    if(!resetPasswordOTP) throw new ApiError(500, "Failed to generate password reset token");

    // Store token in redis
    await setCache(getResetPasswordKey(email), resetPasswordOTP, 5); // 5 minutes

    // Send email in backgrouund
    await emailQueue.add("sendResetPasswordEmail", { email, resetPasswordOTP });

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
    const user = await User.findOne({ email }).select("_id password googleAccount");
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.googleAccount) throw new ApiError(403, "Reset password feature is not available for Google-linked accounts.");

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
    if(!request.user) throw new ApiError(404, "User not found");

    // Get user id
    const userId = request.user._id;
    if(!userId) throw new ApiError(400, "Failed to fetch User ID on google login");

    // Find and validate user
    const user = await User.findById(userId);
    if(!user) throw new ApiError(400, "Failed to fetch user on google login!");
    if(user.status === "pending")
    {
        return response.status(400)
        .json(new ApiResponse(400, { otpRequired: true, userId }, "Your account is not activated yet. Please verify your identity via OTP."));
    }
    if(user.status === "flagged") throw new ApiError(400, "Your account has been flagged. Please contact support for assistance.");

    // Generate access
    const accessToken = await generateAccessToken(user);

    // Validate tokens
    if(!accessToken) throw new ApiError(400, "Failed to generate access token");

    // Redirect
    return response.status(200).json(new ApiResponse(200, { accessToken }, "Login successful"));    
});

// User auth check
const authMe = asyncHandler(async (request, response) => {
    const { _id: userId } = request.user;

    // Response
    return response.status(200).json(new ApiResponse(200, { userId }, "Authenticated!"));
});

// Auth status for login page rendering
const authStatus = asyncHandler(async (request, response) => {
    const accessToken = getAccessToken(request);
    if(!accessToken) return response.status(200).json(new ApiResponse(200, { isLoggedIn: false }, "No login session found!"));

    // Verify
    const user = verifyAccessToken(accessToken);
    if(!user) return response.status(200).json(new ApiResponse(200, { isLoggedIn: false }, "No login session found!")); 
    
    // Response
    return response.status(200).json(new ApiResponse(200, { isLoggedIn: true }, "Login session found")); 
});

module.exports = { signup, login, logout, forgotPassword, resendOTPToken, 
verifyOTP, verifyResetpasswordOTP, resetPassword, googleLogin, authMe, authStatus };