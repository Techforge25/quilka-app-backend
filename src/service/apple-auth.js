const { jwtVerify, createRemoteJWKSet } = require("jose");
const ApiError = require("../utils/ApiError");

// Apple public keys
const appleJWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// Verify Apple identity token
const verifyAppleIdentityToken = async (identityToken, nonce) => {
    // Validate
    if(!identityToken) throw new ApiError(400, "Apple identity token is required");
    if(!nonce) throw new ApiError(400, "Apple authentication nonce is required");

    try
    {
        // Verify token signature and claims
        const { payload } = await jwtVerify(identityToken, appleJWKS, {
            issuer: "https://appleid.apple.com",
            audience: process.env.APPLE_BUNDLE_ID,
            algorithms: ["RS256"]
        });

        // Verify nonce & validate Apple user ID
        if(payload.nonce !== nonce) throw new ApiError(401, "Apple authentication nonce is invalid");
        if(!payload.sub || typeof payload.sub !== "string") throw new ApiError(401, "Apple did not provide a valid user identifier");

        return payload;
    }
    catch(error)
    {
        if(error instanceof ApiError) throw error;
        throw new ApiError(401, "Apple identity token is invalid or expired");
    }
};

module.exports = { verifyAppleIdentityToken };