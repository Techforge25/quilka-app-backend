const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBook, viewBook } = require("../controllers/bookController");

// Router instance
const bookRouter = Router();

// Create book
bookRouter.route("/").post(authentication, createBook);

// View book
bookRouter.route("/:bookId").get(authentication, viewBook);

module.exports = bookRouter;