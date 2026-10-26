const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBookInCustom, createBookInAI, fetchMyBooks, 
viewBook, viewBookContent, createFrontAndCoverImages, regenerateFrontAndCoverImages, 
publishBook, fetchFrontAndBackImages, uploadManualFrontOrCoverImage,
createFrontOrCoverImageWithCustomPrompt, regenerateFrontOrCoverImageWithCustomPrompt } = require("../controllers/bookController");
const { rateLimit } = require("../middlewares/rateLimit");

// Router instance
const bookRouter = Router();

// Inject middleware
bookRouter.use(authentication);

// Create book in custom & AI / Fetch my books
bookRouter.route("/")
.post(createBookInCustom, createBookInAI)
.get(fetchMyBooks);

// View book
bookRouter.route("/:bookId").get(viewBook);

// View book content
bookRouter.route("/:bookId/content").get(viewBookContent);

// Generate & regenerate front and cover images / Fetch front and back images
bookRouter.route("/:bookId/frontAndCover")
.post(rateLimit(1, 1), createFrontAndCoverImages, regenerateFrontAndCoverImages)
.get(fetchFrontAndBackImages);

// Create / Regenerate front or cover image with custom prompt
bookRouter.route("/:bookId/custom/frontOrCover")
.post(createFrontOrCoverImageWithCustomPrompt, regenerateFrontOrCoverImageWithCustomPrompt);

// Publish book
bookRouter.route("/:bookId/publish").patch(authentication, publishBook);

// Upload manual front or cover image
bookRouter.route("/:bookId/manual/upload").post(authentication, uploadManualFrontOrCoverImage);

module.exports = bookRouter;