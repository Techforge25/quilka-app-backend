const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBook, fetchMyBooks, viewBook, viewBookContent } = require("../controllers/bookController");

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

module.exports = bookRouter;