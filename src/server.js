require("dotenv").config();
const connectDB = require("./database/connection");
const startApp = require("./app");
require("./workers/emailWorker");
require("./workers/adminEmailWorker");

(async () => {
    try
    {
        // Connect db
        await connectDB();

        // Start app
        await startApp();
    }
    catch(error)
    {
        console.log(error);
    }
})();