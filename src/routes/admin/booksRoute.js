const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchBookStats, fetchBookOverview } = require("../../controllers/admin/bookController");

// Router instance
const bookRouter = Router();

// Inject middleware
bookRouter.use(expressRateLimit({ maxRequests: 50, minutes: 1 }), adminAuthentication);

// Fetch book stats
bookRouter.route("/:bookId/stats").get(fetchBookStats);

// Fetch book overview
bookRouter.route("/:bookId/overview").get(fetchBookOverview);

module.exports = bookRouter;