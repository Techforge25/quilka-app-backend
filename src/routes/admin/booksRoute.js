const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchBookStats, fetchBookOverview, fetchBookStory, 
fetchBookAIUsage, fetchBookPaymentDetails } = require("../../controllers/admin/bookController");

// Router instance
const bookRouter = Router();

// Inject middleware
bookRouter.use(expressRateLimit({ maxRequests: 50, minutes: 1 }), adminAuthentication);

// Fetch book stats
bookRouter.route("/:bookId/stats").get(fetchBookStats);

// Fetch book overview
bookRouter.route("/:bookId/overview").get(fetchBookOverview);

// Fetch book story
bookRouter.route("/:bookId/story").get(fetchBookStory);

// Fetch book AI usage
bookRouter.route("/:bookId/aiUsage").get(fetchBookAIUsage);

// Fetch book payment details
bookRouter.route("/:bookId/payment").get(fetchBookPaymentDetails);

module.exports = bookRouter;