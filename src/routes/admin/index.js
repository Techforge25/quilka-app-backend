const authRouter = require("./authRoute");
const packageRouter = require("./packageRoute");
const paymentRouter = require("./paymentRoute");
const profileRouter = require("./profileRoute");

// Prefix
const prefix = "/api/v1/admin";

// Register admin routes
const registerAdminRoutes = (app) => {
    app.use(`${prefix}/auth`, authRouter);
    app.use(`${prefix}/profile`, profileRouter);
    app.use(`${prefix}/package`, packageRouter);
    app.use(`${prefix}/payment`, paymentRouter);
};

module.exports = registerAdminRoutes;