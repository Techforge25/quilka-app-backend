const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { expressRateLimit } = require("../../middlewares/rateLimit");
const { fetchUsers, fetchUserStats } = require("../../controllers/admin/userController");

// Router instance
const userRouter = Router();

// Inject middleware
userRouter.use(adminAuthentication);

// Fetch users
userRouter.route("/").get(fetchUsers);

// Fetch user status
userRouter.route("/:userId/stats").get(fetchUserStats);

module.exports = userRouter;