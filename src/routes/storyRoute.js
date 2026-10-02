const { Router } = require("express");
const { generateWithAi, createStory, viewStoryContent } = require("../controllers/storyController");
const { authentication } = require("../middlewares/auth");

// Router instance
const storyRouter = Router();

// Inject middleware
storyRouter.use(authentication);

// Generate story with AI
storyRouter.route("/:bookId").post(generateWithAi);

// Create story
storyRouter.route("/").post(createStory);

// View story content / Update story
storyRouter.route("/:bookId")
.get(viewStoryContent);

module.exports = storyRouter;