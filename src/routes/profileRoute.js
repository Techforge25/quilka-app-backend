const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { viewPersonalInfo, updateInfo, updatePassword, 
sendSupportEmail } = require("../controllers/profileController");
const { rateLimit } = require("../middlewares/rateLimit");
const upload = require("../utils/multer");

// Router instance
const profileRouter = Router();

// View personal info / Update personal info
profileRouter.route("/info")
.get(authentication, viewPersonalInfo)
.patch(authentication, rateLimit(5, 1), updateInfo);

// Update password
profileRouter.route("/password").patch(authentication, rateLimit(3, 1), updatePassword);

// Support email
profileRouter.route("/support").post(authentication, rateLimit(2, 1), upload.single('attachment'), sendSupportEmail);

module.exports = profileRouter;