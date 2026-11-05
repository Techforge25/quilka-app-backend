const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { createPackage, fetchPackages, updatePackage, 
updateCreditsAllowance } = require("../../controllers/admin/packageController");

// Router instance
const packageRouter = Router();

// Inject middleware
packageRouter.use(adminAuthentication);

// Create / Fetch packages
packageRouter.route("/")
.post(expressRateLimit({ maxRequests: 5, minutes: 1 }), createPackage)
.get(fetchPackages);

// Update package
packageRouter.route("/:packageId").put(expressRateLimit({ maxRequests: 5, minutes: 1 }), updatePackage);

// Update credits allowance
packageRouter.route("/credits/:creditId").patch(expressRateLimit({ maxRequests: 5, minutes: 1 }), updateCreditsAllowance);

module.exports = packageRouter;