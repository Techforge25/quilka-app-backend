const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchUsers, fetchUserStats, fetchUserBooks } = require("../../controllers/admin/userController");

// Router instance
const userRouter = Router();

// Inject middleware
userRouter.use(expressRateLimit({ maxRequests: 50, minutes: 1 }), adminAuthentication);

// Fetch users
userRouter.route("/").get(fetchUsers);

// Fetch user stats
userRouter.route("/:userId/stats").get(fetchUserStats);

// Fetch user books
userRouter.route("/:userId/books").get(fetchUserBooks);

module.exports = userRouter;