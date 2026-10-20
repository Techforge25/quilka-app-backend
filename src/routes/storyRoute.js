const { Router } = require("express");
const { generateWithAi, regenerateStoryText, useNewStoryVersion, updateStory, viewStoryContent, 
refineCustomStoryWithAI, updateStoryWithSpreadTextSize, finalizeTextPhase, 
finalizeIllustrationPhase } = require("../controllers/storyController");
const { authentication } = require("../middlewares/auth");
const { rateLimit } = require("../middlewares/rateLimit");

// Router instance
const storyRouter = Router();

// Inject middleware
storyRouter.use(authentication);

// Generate & Regenerate story text with AI / View story content / Update story
storyRouter.route("/:bookId")
.post(rateLimit(1, 1), generateWithAi, regenerateStoryText)
.get(viewStoryContent)
.patch(updateStory);

// Refine custom story with AI
storyRouter.route("/:bookId/refine").patch(rateLimit(10, 1), refineCustomStoryWithAI);

// Use new story version
storyRouter.route("/:bookId/newVersion").patch(useNewStoryVersion);

// Update story with spread text size (AI & CUSTOM)
storyRouter.route("/:bookId/spread/:spreadId").patch(rateLimit(10, 1), updateStoryWithSpreadTextSize);

// Finalize text phase
storyRouter.route("/:bookId/finalizeTextStory").post(rateLimit(1, 1), finalizeTextPhase);

// Finalize illustration phase
storyRouter.route("/:bookId/finalizeIllustrations").post(rateLimit(1, 1), finalizeIllustrationPhase);

module.exports = storyRouter;