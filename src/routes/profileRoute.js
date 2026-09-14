const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { viewPersonalInfo, updateInfo } = require("../controllers/profileController");

// Router instance
const profileRouter = Router();

// View personal info / Update personal info
profileRouter.route("/info")
.get(authentication, viewPersonalInfo)
.patch(authentication, updateInfo);

// Update password
profileRouter.route("/password").patch(authentication, updateInfo);

module.exports = profileRouter;