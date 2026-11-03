const { Router } = require("express");
const { adminLogin, authMe, adminLogout, adminRefreshAccessToken } = require("../../controllers/admin/adminAuthController");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { rateLimit } = require("../../middlewares/rateLimit");

// Router instance
const adminAuthRouter = Router();

// Login
adminAuthRouter.route("/login").post(rateLimit(5, 5, "Too many login attempts!"), adminLogin);

// Auth me
adminAuthRouter.route("/me").get(adminAuthentication, authMe);

// Refresh token
adminAuthRouter.route("/refreshToken").get(adminRefreshAccessToken);

// Logout
adminAuthRouter.route("/logout").get(adminAuthentication, adminLogout);

module.exports = adminAuthRouter;