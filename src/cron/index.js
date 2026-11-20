// Cron job initialization
const initializeCronJobs = () => {
    require("./deletePendingBooks");
    require("./deleteSuspendedUsers");

    console.log("Cron jobs initialized successfully");
};

module.exports = initializeCronJobs;