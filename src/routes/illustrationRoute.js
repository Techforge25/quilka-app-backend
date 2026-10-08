const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createIllustration, updateTextAndBgTextColor } = require("../controllers/illustrationController");

// Router instance
const illustrationRouter = Router();

// Inject middleware
illustrationRouter.use(authentication);

// Create illustration
illustrationRouter.route("/:bookId/spread/:spreadId").post(createIllustration);

// Update text color and text bg color
illustrationRouter.route("/:bookId/spread/:spreadId/color").patch(updateTextAndBgTextColor);

module.exports = illustrationRouter;