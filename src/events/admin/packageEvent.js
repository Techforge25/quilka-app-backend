const EventEmitter = require("events");
const { deleteCacheByPattern } = require("../../redis/redisHelpers");
const Package = require("../../models/packageModel");
const FreeCredit = require("../../models/freeCreditModel");

// Event instance
const packageEvent = new EventEmitter();

// Create package
packageEvent.on("createPackage", async ({ name, credits, price, description, extras }) => {
    try
    {
        await Promise.all([
            Package.create({ name, credits, price, description, extras }),
            deleteCacheByPattern(`packages*`)
        ]);
    }
    catch(error)
    {
        console.log("Failed to create package:", error);
    }
});

// Update package
packageEvent.on("updatePackage", async ({ packageId, name, credits, price, description, extras }) => {
    try
    {
        await Package.findByIdAndUpdate(packageId, { name, credits, price, description, extras });
        await deleteCacheByPattern(`packages*`);
    }
    catch(error)
    {
        console.log("Failed to update package:", error);
    }
});

// Update credits allowance
packageEvent.on("updateCreditsAllowance", async ({ creditId, enable, credits }) => {
    try
    {
        await FreeCredit.findByIdAndUpdate(creditId, { enable, credits });
        await deleteCacheByPattern(`freeCredits`);
    }
    catch(error)
    {
        console.log("Failed to update free credits allowance:", error);
    }
});

module.exports = { packageEvent };