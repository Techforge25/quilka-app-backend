const cron = require("node-cron");
const Book = require("../models/bookModel");

// Runs daily at 12:00 AM
const timer = "0 0 * * *";

// Auto exprire subscription
cron.schedule(timer, async () => {
    console.log("Running cron job for deleting pending books");

    // Get one day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Delete after one day
    await Book.deleteMany({ status: "pending", createdAt: { $lte: oneDayAgo } });
});