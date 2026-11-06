const { Router } = require("express");
const { adminLogin, authMe, adminLogout, adminRefreshAccessToken } = require("../../controllers/admin/adminAuthController");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { rateLimit } = require("../../middlewares/rateLimit");

// Router instance
const authRouter = Router();

// Login
authRouter.route("/login").post(rateLimit(5, 5, "Too many login attempts!"), adminLogin);

// Auth me
authRouter.route("/me").get(adminAuthentication, authMe);

// Refresh token
authRouter.route("/refreshToken").get(adminRefreshAccessToken);

// Logout
authRouter.route("/logout").get(adminAuthentication, adminLogout);

module.exports = authRouter;