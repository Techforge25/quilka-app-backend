const EventEmitter = require("events");
const { deleteCacheByPattern } = require("../../redis/redisHelpers");
const Package = require("../../models/packageModel");

// Event instance
const packageEvent = new EventEmitter();

// Create package
packageEvent.on("createPackage", async ({ name, credits, price, description, extras }) => {
    try
    {
        await Package.create({ name, credits, price, description, extras });
        await deleteCacheByPattern(`packages*`);
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

module.exports = { packageEvent };