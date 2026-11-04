const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { createPackage, fetchPackages, updatePackage } = require("../../controllers/admin/packageController");

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

module.exports = packageRouter;