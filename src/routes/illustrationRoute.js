const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createIllustration, uploadManualIllustration, generateWithCustomPrompt,
updateSpreadSublayout } = require("../controllers/illustrationController");

// Router instance
const illustrationRouter = Router();

// Inject middleware
illustrationRouter.use(authentication);

// Create illustration
illustrationRouter.route("/:bookId/spread/:spreadId").post(createIllustration);

// Upload manual illustration
illustrationRouter.route("/:bookId/spread/:spreadId/upload").post(uploadManualIllustration);

// Generate illustration with custom prompt
illustrationRouter.route("/:bookId/spread/:spreadId/prompt").post(generateWithCustomPrompt);

// Update spread sublayout
illustrationRouter.route("/:bookId/spread/:spreadId/sublayout").patch(updateSpreadSublayout);

module.exports = illustrationRouter;