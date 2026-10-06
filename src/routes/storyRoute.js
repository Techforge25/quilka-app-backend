const { Router } = require("express");
const { generateWithAi, viewStoryContent, updateStory, finalizeTextPhase } = require("../controllers/storyController");
const { authentication } = require("../middlewares/auth");

// Router instance
const storyRouter = Router();

// Inject middleware
storyRouter.use(authentication);

// Generate story with AI
storyRouter.route("/:bookId").post(generateWithAi);

// View story content / Update story
storyRouter.route("/:bookId")
.get(viewStoryContent)
.patch(updateStory);

// Finalize text phase
storyRouter.route("/:bookId/finalizeTextStory").post(finalizeTextPhase);

module.exports = storyRouter;