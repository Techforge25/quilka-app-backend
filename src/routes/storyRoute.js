const { Router } = require("express");
const { createStory, viewStoryContent } = require("../controllers/storyController");

// Router instance
const storyRouter = Router();

// Create story
storyRouter.route("/").post(createStory);

// View story content / Update story
storyRouter.route("/:bookId")
.get(viewStoryContent);

module.exports = storyRouter;