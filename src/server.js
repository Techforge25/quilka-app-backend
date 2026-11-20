require("dotenv").config();
const connectDB = require("./database/connection");
const startApp = require("./app");
const initializeCronJobs = require("./cron");
const initializeWorkers = require("./workers");

(async () => {
    try
    {
        // Connect db
        await connectDB();

        // Initialize cron jobs
        initializeCronJobs();

        // Initialize workers
        initializeWorkers();

        // Start app
        await startApp();
    }
    catch(error)
    {
        console.log("Server startup failed:", error);
        process.exit(1);
    }
})();