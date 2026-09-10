const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const bcrypt = require("bcrypt");

// Schema
const userSchema = new Schema({
    gid: { type: String, trim: true, unqiue: true },
    fullName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: [true, "This email has already been registered"] },
    password: { type: String, trim: true, required: true },
    status: { type: String, trim: true, enum: ["pending", "active", "flagged"], default: "pending" },
    role: { type: String, trim: true, enum: ["user"], default: "user" },

    // Google account flag
    googleAccount: { type: Boolean, default: false }
}, { timestamps: true });

// Hash password
userSchema.pre("save", async function() {
    if(!this.isModified("password")) return;
    try 
    {
        this.password = await bcrypt.hash(this.password, 10);
    } 
    catch(error) 
    {
        console.log("Failed to hash user password", error.message);
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
        console.log("Failed to compare passwords", error.message);
        return false;
    }
}

// Add pagination plugin
userSchema.plugin(aggregatePaginate);

// Model
const User = model("User", userSchema);

module.exports = User;