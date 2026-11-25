const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");

// Router instance
const dashboardRouter = Router();

// Inject middleware
dashboardRouter.use(adminAuthentication);

module.exports = dashboardRouter;