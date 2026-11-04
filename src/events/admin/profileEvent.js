const EventEmitter = require("events");
const Admin = require("../../models/adminModel");
const { deleteCacheByPattern } = require("../../redis/redisHelpers");

// Event instance
const profileEvent = new EventEmitter();

// Update username
profileEvent.on("updateUsername", async ({ adminId, username }) => {
    try
    {
        await Admin.findByIdAndUpdate(adminId, { $set: { username } });
        await deleteCacheByPattern(`admin:${adminId}:username`);
    }
    catch(error)
    {
        console.log("Failed to update username:", error);
    }
});

module.exports = { profileEvent };