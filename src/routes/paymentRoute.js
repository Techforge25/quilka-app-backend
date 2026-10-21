const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { payForBook, payForRegeneration } = require("../controllers/paymentController");

// Router instance
const paymentRouter = Router();

// Pay for book
paymentRouter.route("/book/:bookId").post(authentication, payForBook);

// Pay for regenerations
paymentRouter.route("/book/:bookId/regeneration").post(authentication, payForRegeneration);

module.exports = paymentRouter;