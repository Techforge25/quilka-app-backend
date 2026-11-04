const { Router } = require("express");
const { fetchUsername, updateUsername, updatePassword } = require("../../controllers/admin/adminProfileController");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");

// Router instance
const adminProfileRouter = Router();

// Inject middleware
adminProfileRouter.use(adminAuthentication);

// Fetch / Update username
adminProfileRouter.route("/username")
.get(expressRateLimit({ maxRequests: 5, minutes: 1 }), fetchUsername)
.patch(expressRateLimit({ maxRequests: 3, minutes: 1 }), updateUsername);

// Update password
adminProfileRouter.route("/password").patch(updatePassword);

module.exports = adminProfileRouter;