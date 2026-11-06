const authRouter = require("./authRoute");
const bookRouter = require("./bookRoute");
const illustrationRouter = require("./illustrationRoute");
const packageRouter = require("./packageRoute");
const paymentRouter = require("./paymentRoute");
const profileRouter = require("./profileRoute");
const storyRouter = require("./storyRoute");

// Prefix
const prefix = "/api/v1";

// Register user routes
const registerUserRoutes = (app) => {
    app.use(`${prefix}/auth`, authRouter);
    app.use(`${prefix}/book`, bookRouter);
    app.use(`${prefix}/payment`, paymentRouter);
    app.use(`${prefix}/profile`, profileRouter);
    app.use(`${prefix}/story`, storyRouter);
    app.use(`${prefix}/illustration`, illustrationRouter);
    app.use(`${prefix}/package`, packageRouter);
};

module.exports = registerUserRoutes;