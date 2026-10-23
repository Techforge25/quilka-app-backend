const cron = require("node-cron");
const Book = require("../models/bookModel");
const Spread = require("../models/spreadModel");
const ApiError = require("../utils/ApiError");

// Runs every 2 hours
const timer = "0 */2 * * *";

// Auto exprire subscription
cron.schedule(timer, async () => {
    console.log("Running cron job for deleting pending books");

    // Get one day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    try
    {
        // Find pending books
        const books = await Book.find({ status: "pending", createdAt: { $lte: oneDayAgo } }).select("_id").lean();
        if(!books.length) return;

        // Extract IDs
        const bookIds = books.map(book => String(book._id));

        // Delete books and connected spreads
        await Book.deleteMany({ _id: { $in: bookIds } });
        await Spread.deleteMany({ bookId: { $in: bookIds } });
        console.log(`Deleted ${bookIds.length} expired pending books`);
        return;
    }
    catch(error)
    {
        console.log(`Failed to delete pending books ${error.message}`);
        throw new ApiError(400, error.message);
    }
});