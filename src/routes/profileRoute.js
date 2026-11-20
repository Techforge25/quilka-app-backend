const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { viewPersonalInfo, updateInfo, updatePassword, 
sendSupportEmail, deleteAccount, confirmDeleteAccount } = require("../controllers/profileController");
const { expressRateLimit } = require("../middlewares/rateLimit");
const upload = require("../utils/multer");

// Router instance
const profileRouter = Router();

// Inject middleware
profileRouter.use(authentication);

// View personal info / Update personal info
profileRouter.route("/info")
.get(viewPersonalInfo)
.patch(expressRateLimit({ maxRequests: 5, minutes: 1 }), updateInfo);

// Update password
profileRouter.route("/password").patch(expressRateLimit({ maxRequests: 3, minutes: 1 }), updatePassword);

// Support email
profileRouter.route("/support").post(expressRateLimit({ maxRequests: 2, minutes: 1 }), upload.single('attachment'), sendSupportEmail);

// Delete account (Step: 01)
profileRouter.route("/delete").post(expressRateLimit({ maxRequests: 2, minutes: 1 }), deleteAccount);

// Confirm delete account (Step: 02)
profileRouter.route("/delete/:otp").delete(expressRateLimit({ maxRequests: 5, minutes: 1 }), confirmDeleteAccount);

module.exports = profileRouter;