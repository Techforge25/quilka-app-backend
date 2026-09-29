const { Router } = require("express");
const { createStory } = require("../controllers/storyController");

// Router instance
const storyRouter = Router();

// Create story
storyRouter.route("/").post(createStory);

module.exports = storyRouter;