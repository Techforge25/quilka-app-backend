const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const { generateAdminAuthToken } = require("../utils/adminAccessToken");

// Schema
const adminSchema = new Schema({
    username: { type: String, trim: true, lowercase: true, required: true, unique: [true, "This username has already been taken by another admin"] },
    email: { type: String, trim: true, lowercase: true, required: true, unique: [true, "This email has already been taken by another admin"] },
    password: { type: String, trim: true, required: true },
    refreshToken: { type: String, default: undefined }
}, { timestamps: true });

// Hash password
adminSchema.pre("save", async function() {
    if(!this.isModified("password")) return;
    try 
    {
        this.password = await bcrypt.hash(this.password, 10);
    } 
    catch(error) 
    {
        throw new ApiError("Failed to hash admin password", error.message);
    }
});

// Match password
adminSchema.methods.matchPassword = async function(password) {
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
adminSchema.methods.generateAuthTokens = async function() {
    try 
    {
        // Tokens
        const accessToken = generateAdminAuthToken(this, "access");
        const refreshToken = generateAdminAuthToken(this, "refresh");

        // Save refresh token's hash to db
        this.refreshToken = await bcrypt.hash(refreshToken, 10);
        await this.save();

        return { accessToken, refreshToken };
    } 
    catch(error) 
    {
        console.log("Failed to generate auth tokens:", error.message);
        return null;
    }
}

// Match refresh token hash
adminSchema.methods.matchRefreshToken = async function(refreshToken) {
    if(!refreshToken) return false;
    try 
    {
       return await bcrypt.compare(refreshToken, this.refreshToken); 
    } 
    catch(error) 
    {
        throw new ApiError("Failed to compare refresh token", error.message);
    }
}

// Add pagination plugin
adminSchema.plugin(aggregatePaginate);

// Model
const Admin = model("Admin", adminSchema);

module.exports = Admin;