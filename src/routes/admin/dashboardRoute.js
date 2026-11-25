const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchBusinessOverviewStats, fetchAIStats } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Inject middleware
dashboardRouter.use(adminAuthentication);

// Fetch business overview stats
dashboardRouter.route("/business-stats").get(fetchBusinessOverviewStats);

// Fetch AI stats
dashboardRouter.route("/ai-stats").get(fetchAIStats);

module.exports = dashboardRouter;