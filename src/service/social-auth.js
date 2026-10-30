const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
const ApiError = require('../utils/ApiError');

// Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
},

async (accessToken, refreshToken, profile, done) => {
    try
    {
        // Extract properties
        const gid = profile?.id;
        const email = profile?.emails?.[0]?.value;
        const firstName = profile?.name?.givenName || "";
        const lastName  = profile?.name?.familyName || "";
        const fullName = `${firstName} ${lastName}`.trim() || "Anonymous";

        // Validate metadata
        if(!gid || !email) throw new ApiError(400, "Google did not provide the required account information");

        // If user already exist in database
        let user = await User.findOne({ gid });
        if(user) return done(null, user);
        
        // Check whether email is already registered via normal auth
        user = await User.findOne({ email });
        if(user) throw new ApiError(409, "An account with this email already exists. Please sign in using your existing login method");
        
        // Create new user
        user = await User.create({
            gid,
            fullName,
            email,
            googleAccount: true,
            status: 'active'
        });
        return done(null, user);
    } 
    catch(error) 
    {
        return done(error, null);
    }
}));

// Initializers and callbacks
const googleAuthInit = passport.authenticate('google', { 
    scope: ['profile', 'email'], 
    prompt: "select_account" 
});

const googleAuthCallback = passport.authenticate('google', { 
    session: false, 
    failureRedirect: `frontendDomain/login` 
});

module.exports = { googleAuthInit, googleAuthCallback };