const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchPaymentStats, fetchPayments } = require("../../controllers/admin/paymentController");

// Router instance
const paymentRouter = Router();

// Inject middleware
paymentRouter.use(adminAuthentication);

// Fetch payment stats
paymentRouter.route("/stats").get(expressRateLimit({ maxRequests: 50, minutes: 1 }), fetchPaymentStats);

// Fetch payment stats
paymentRouter.route("/").get(expressRateLimit({ maxRequests: 50, minutes: 1 }), fetchPayments);

module.exports = paymentRouter;