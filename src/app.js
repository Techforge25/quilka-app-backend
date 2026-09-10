const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { corsOptions, port } = require("./constants");
const compression = require("compression");
const errorHandler = require("./middlewares/errorHandler");
const passport = require("passport");
// require("./service/social-auth");
const helmet = require("helmet");
const limitRequest = require("./middlewares/rateLimit");

// Initialize express app
async function startApp()
{
    // Express app instance
    const app = express();

    // Middlewares
    app.use(helmet());
    app.use(cors(corsOptions));
    app.use(limitRequest({ maxRequests: 100 }));
    app.set("trust proxy", 1);
    app.use(cookieParser(process.env.COOKIE_PARSER_SECRET));
    app.use(express.urlencoded({ extended: true, limit: "50kb" }));
    app.use(express.json({ limit: "50kb" }));
    app.use(passport.initialize());
    app.use("/public", express.static(path.resolve("public")));
    app.use(compression());

    // Import Routes
    const authRouter = require("./routes/authRoute");

    // Registered Routes
    app.use("/api/v1/auth", authRouter);

    // Import Admin Routes
    const adminAuthRouter = require("./routes/admin/adminAuthRoute");

    // Registered Admin Routes
    app.use("/api/v1/admin/auth", adminAuthRouter);

    // API status route
    app.get("/", (request, response) => response.send(`Server is up and running at port ${port}`));

    // Error handling middleware
    app.use(errorHandler);

    // Start app
    app.on("error", (error) => console.log("Failed to start express app", error.message));
    app.listen(port, () => console.log(`Server is up and running on port ${port}`));
}

module.exports = startApp;