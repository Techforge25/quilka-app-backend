const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBook, updateBook, fetchMyBooks, viewBook, viewBookContent, 
createFrontAndCoverImages, publishBook, fetchFrontAndBackImages } = require("../controllers/bookController");

// Router instance
const bookRouter = Router();

// Inject middleware
bookRouter.use(authentication);

// Create book / Fetch my books
bookRouter.route("/")
.post(createBook)
.get(fetchMyBooks);

// View book / Update book
bookRouter.route("/:bookId")
.get(viewBook)
.put(updateBook);

// View book content
bookRouter.route("/:bookId/content").get(viewBookContent);

// Generate front and cover images / Fetch front and back images
bookRouter.route("/:bookId/frontAndCover")
.post(createFrontAndCoverImages)
.get(fetchFrontAndBackImages);

// Publish book
bookRouter.route("/:bookId/publish").patch(authentication, publishBook);


module.exports = bookRouter;