const { Router } = require("express");
const { updateUsername, updatePassword } = require("../../controllers/admin/adminProfileController");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { rateLimit } = require("../../middlewares/rateLimit");

// Router instance
const adminProfileRouter = Router();

// Inject middleware
adminProfileRouter.use(adminAuthentication);

// Update username
adminProfileRouter.route("/username").patch(updateUsername);

// Update password
adminProfileRouter.route("/password").patch(updatePassword);

module.exports = adminProfileRouter;