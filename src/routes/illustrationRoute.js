const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createIllustration } = require("../controllers/illustrationController");

// Router instance
const illustrationRouter = Router();

// Inject middleware
illustrationRouter.use(authentication);

// Create illustration
illustrationRouter.route("/:bookId/spreads/:spreadId").post(createIllustration);

module.exports = illustrationRouter;