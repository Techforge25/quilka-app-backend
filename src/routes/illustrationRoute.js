const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createIllustration, uploadManualIllustration, generateWithCustomPrompt,
updateSpreadSublayout } = require("../controllers/illustrationController");
const { rateLimit } = require("../middlewares/rateLimit");

// Router instance
const illustrationRouter = Router();

// Inject middleware
illustrationRouter.use(authentication);

// Create illustration
illustrationRouter.route("/:bookId/spread/:spreadId").post(rateLimit(3, 1), createIllustration);

// Upload manual illustration
illustrationRouter.route("/:bookId/spread/:spreadId/upload").post(rateLimit(3, 1), uploadManualIllustration);

// Generate illustration with custom prompt
illustrationRouter.route("/:bookId/spread/:spreadId/prompt").post(rateLimit(2, 1), generateWithCustomPrompt);

// Update spread sublayout
illustrationRouter.route("/:bookId/spread/:spreadId/sublayout").patch(rateLimit(10, 1), updateSpreadSublayout);

module.exports = illustrationRouter;