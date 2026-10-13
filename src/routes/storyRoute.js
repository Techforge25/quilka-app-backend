const { Router } = require("express");
const { generateWithAi, regenerateStoryText, viewStoryContent, updateStory, 
finalizeTextPhase, finalizeIllustrationPhase } = require("../controllers/storyController");
const { authentication } = require("../middlewares/auth");
const { rateLimit } = require("../middlewares/rateLimit");

// Router instance
const storyRouter = Router();

// Inject middleware
storyRouter.use(authentication);

// Generate & Regenerate story text with AI
storyRouter.route("/:bookId").post(rateLimit(1, 1), generateWithAi, regenerateStoryText);

// View story content
storyRouter.route("/:bookId").get(viewStoryContent);

// Update story
storyRouter.route("/:bookId/spread/:spreadId").patch(rateLimit(10, 1), updateStory);

// Finalize text phase
storyRouter.route("/:bookId/finalizeTextStory").post(rateLimit(1, 1), finalizeTextPhase);

// Finalize illustration phase
storyRouter.route("/:bookId/finalizeIllustrations").post(rateLimit(1, 1), finalizeIllustrationPhase);

module.exports = storyRouter;