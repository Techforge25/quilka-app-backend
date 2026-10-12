const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createIllustration, uploadManualIllustration, updateTextAndBgTextColor } = require("../controllers/illustrationController");

// Router instance
const illustrationRouter = Router();

// Inject middleware
illustrationRouter.use(authentication);

// Create illustration
illustrationRouter.route("/:bookId/spread/:spreadId").post(createIllustration);

// Upload manual illustration
illustrationRouter.route("/:bookId/spread/:spreadId/upload").post(uploadManualIllustration);

// Update text color and text bg color
illustrationRouter.route("/:bookId/spread/:spreadId/color").patch(updateTextAndBgTextColor);

module.exports = illustrationRouter;