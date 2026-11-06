const authRouter = require("./authRoute");
const packageRouter = require("./packageRoute");
const paymentRouter = require("./paymentRoute");
const profileRouter = require("./profileRoute");
const userRouter = require("./userRoute");

// Prefix
const prefix = "/api/v1/admin";

// Register admin routes
const registerAdminRoutes = (app) => {
    app.use(`${prefix}/auth`, authRouter);
    app.use(`${prefix}/profile`, profileRouter);
    app.use(`${prefix}/package`, packageRouter);
    app.use(`${prefix}/payment`, paymentRouter);
    app.use(`${prefix}/user`, userRouter);
};

module.exports = registerAdminRoutes;