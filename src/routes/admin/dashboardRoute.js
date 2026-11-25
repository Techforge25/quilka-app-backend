const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchBusinessOverviewStats, fetchAIStats, 
fetchRecentPurchasedBooks } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Inject middleware
dashboardRouter.use(adminAuthentication, expressRateLimit({ maxRequests: 80, minutes: 2 }));

// Fetch business overview stats
dashboardRouter.route("/business-stats").get(fetchBusinessOverviewStats);

// Fetch AI stats
dashboardRouter.route("/ai-stats").get(fetchAIStats);

// Fetch recent book
dashboardRouter.route("/recent-books").get(fetchRecentPurchasedBooks);

module.exports = dashboardRouter;