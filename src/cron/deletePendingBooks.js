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
        const books = await Book.find({ status: "pending", createdAt: { $lte: oneDayAgo } }).select("_id");
        for(const book of books)
        {
            const { _id: bookId } = book;
            await Book.findByIdAndDelete(bookId);
            await Spread.deleteMany({ bookId });
        }
    }
    catch(error)
    {
        throw new ApiError(400, error.message);
    }
});