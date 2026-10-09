const { Router } = require("express");
const { generateWithAi, viewStoryContent, updateStory, 
finalizeTextPhase, finalizeIllustrationPhase } = require("../controllers/storyController");
const { authentication } = require("../middlewares/auth");

// Router instance
const storyRouter = Router();

// Inject middleware
storyRouter.use(authentication);

// Generate story with AI
storyRouter.route("/:bookId").post(generateWithAi);

// View story content
storyRouter.route("/:bookId").get(viewStoryContent);

// Update story
storyRouter.route("/:bookId/spread/:spreadId").patch(updateStory);

// Finalize text phase
storyRouter.route("/:bookId/finalizeTextStory").post(finalizeTextPhase);

// Finalize illustration phase
storyRouter.route("/:bookId/finalizeIllustrations").post(finalizeIllustrationPhase);

module.exports = storyRouter;