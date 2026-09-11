const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBook } = require("../controllers/bookController");

// Router instance
const bookRouter = Router();

// Create book
bookRouter.route("/").post(authentication, createBook);

module.exports = bookRouter;