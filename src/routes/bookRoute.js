const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBook, fetchMyBooks, viewBook, viewBookContent, createFrontAndCoverImages } = require("../controllers/bookController");

// Router instance
const bookRouter = Router();

// Create book / Fetch my books
bookRouter.route("/")
.post(authentication, createBook)
.get(authentication, fetchMyBooks);

// View book
bookRouter.route("/:bookId").get(authentication, viewBook);

// View book content
bookRouter.route("/:bookId/content").get(authentication, viewBookContent);

// Generate front and cover images
bookRouter.route("/:bookId/frontAndCover").post(authentication, createFrontAndCoverImages);

module.exports = bookRouter;