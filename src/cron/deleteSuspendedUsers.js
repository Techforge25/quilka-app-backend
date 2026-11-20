const cron = require("node-cron");
const User = require("../models/userModel");

// Runs every 6 hours
const timer = "0 */6 * * *";

// Auto delete suspended users
cron.schedule(timer, async () => {
    console.log("Running cron job for deleting suspended users");

    // Get 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get 5 minutes ago
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    try
    {
        // Find suspended users
        const users = await User.find({
            status: "suspended",
            "statusTimestamps.suspendedAt": { $lte: fiveMinutesAgo } 
        }).select("_id").lean();
        if(!users.length) return;

        // Extract IDs
        const userIds = users.map(user => String(user._id));

        // Delete users and connected spreads
        await User.updateMany(
            { _id: { $in: userIds }},
            [
                {
                    $set: {
                        fullName: "Deleted User",
                        email: {
                            $concat: ["deleted_", { $toString: "$_id" }, "@deleted.quilka.local"]
                        },
                        status: "deleted",
                        "statusTimestamps.deletedAt": "$$NOW",
                        googleAccount: false,
                        appleAccount: false
                    }
                },
                { $unset: ["password", "gid", "appleId"] }
            ],
            { updatePipeline: true }
        );
        console.log(`Deleted ${users.length} suspended users`);
        return;
    }
    catch(error)
    {
        console.log(`Failed to delete suspended users: ${error.message}`);
    }
});