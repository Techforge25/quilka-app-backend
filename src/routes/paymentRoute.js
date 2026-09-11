const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { payForBook } = require("../controllers/paymentController");

// Router instance
const paymentRouter = Router();

// Pay for book
paymentRouter.route("/book/:bookId").post(authentication, payForBook);

module.exports = paymentRouter;