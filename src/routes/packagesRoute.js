const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { fetchPackages } = require("../controllers/packageController");

// Router instance
const packageRouter = Router();

// Fetch packages
packageRouter.route("/").get(authentication, fetchPackages);

module.exports = packageRouter;