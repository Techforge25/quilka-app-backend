const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const { generateAccessToken, generateRefreshToken, getRefreshToken } = require("../utils/accessToken");
const crypto = require("crypto");
const { setCache } = require("../redis/redisHelpers");
const { getRefreshTokenKey } = require("../utils/redisKeys");

// Password condition
function isPasswordRequired()
{
    return !this.googleAccount && !this.appleAccount;
}

// Schema
const userSchema = new Schema({
    // Google & Apple account IDs
    gid: { type: String, trim: true, required: function() { return this.googleAccount } },
    appleId: { type: String, trim: true, required: function() { return this.appleAccount } },

    // Basic info
    fullName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: [true, "This email has already been registered"] },
    password: { type: String, trim: true, required: isPasswordRequired },

    // Security and access
    status: { type: String, trim: true, enum: ["pending", "active", "suspended"], default: "pending" },
    role: { type: String, trim: true, enum: ["user"], default: "user" },

    // Social account flags
    googleAccount: { type: Boolean, default: false },
    appleAccount: { type: Boolean, default: false },
}, { timestamps: true });

// Social authentication indexes
userSchema.index({ gid: 1 }, { unique: true, sparse: true });
userSchema.index({ appleId: 1 }, { unique: true, sparse: true });

/* 
    Note: Sparse unique indexes allow multiple documents to omit the field while enforcing uniqueness for indexed values only. 
*/

// Hash password
userSchema.pre("save", async function() {
    if(!this.isModified("password")) return;
    try 
    {
        this.password = await bcrypt.hash(this.password, 10);
    } 
    catch(error)
    {
        throw new ApiError("Failed to hash user password", error.message);
    }
});

// Match password
userSchema.methods.matchPassword = async function(password) {
    if(!password) return false;
    try 
    {
       return await bcrypt.compare(password, this.password); 
    } 
    catch (error) 
    {
        throw new ApiError("Failed to compare passwords", error.message);
    }
}

// Generate auth tokens
userSchema.methods.generateAuthTokens = async function(sessionId = crypto.randomUUID()) {
    try 
    {
        // Tokens
        const accessToken = generateAccessToken(this, sessionId);
        const refreshToken = generateRefreshToken(this, sessionId);
    
        // Store refresh token in redis
        const isStored = await setCache(getRefreshTokenKey(sessionId), refreshToken, 60 * 24 * 90);
        if(!isStored) throw new ApiError(500, "Failed to store refresh token");    
        return { accessToken, refreshToken };
    } 
    catch(error) 
    {
        console.log("Failed to generate auth tokens:", error.message);
        return null;
    }
}

// Add pagination plugin
userSchema.plugin(aggregatePaginate);

// Model
const User = model("User", userSchema);

module.exports = User;