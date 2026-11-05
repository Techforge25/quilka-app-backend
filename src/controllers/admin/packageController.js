const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validatePayload = require("../../utils/validatePayload");
const { getCache, setCache } = require("../../redis/redisHelpers");
const Package = require("../../models/packageModel");
const { emptyList } = require("../../constants");
const FreeCredit = require("../../models/freeCreditModel");
const { createPackageValidator } = require("../../validators/packageValidator");
const { packageEvent } = require("../../events/admin/packageEvent");
const { isValidObjectId } = require("mongoose");

// Create package
const createPackage = asyncHandler(async (request, response) => {
    // Sanitize payload
    const { name, credits, price, description, extras } = validatePayload(createPackageValidator, request.body) || {};

    // Prevent packacge duplication
    const package = await Package.findOne({ name: { $regex: `^${name}$`, $options: "i" } }).select("_id").lean();
    if(package) throw new ApiError(400, "Package with this name already exists");

    // Payload
    const payload = { name, credits, price, description, extras };
    
    // Trigger event
    packageEvent.emit("createPackage", payload);

    // Response
    return response.status(201).json(new ApiResponse(201, payload, "New package has been created"));
});

// Fetch packages
const fetchPackages = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Keys
    const packageKey = `packages:page:${page}:limit:${limit}`;
    const creditKey = `freeCredits`;

    // Get from cache
    let [packages, freeCredits] = await Promise.all([
        getCache(packageKey),
        getCache(creditKey)
    ]);

    if(!packages)
    {
        // Get from DB
        packages = await Package.aggregatePaginate([
            // Sort
            { $sort: { createdAt: 1 } },

            // Projection
            {
                $project: {
                    name: 1,
                    credits: 1,
                    price: 1,
                    description: 1,
                    extras: 1
                }
            },
        ], { page, limit });

        // Set in cache
        await setCache(packageKey, packages, 60 * 24 * 7);
    }

    if(!freeCredits)
    {
        freeCredits = await FreeCredit.findOne({}).select("credits enable").lean();
        await setCache(creditKey, freeCredits, 60 * 24 * 7);
    }
    if(!packages.totalDocs) return response.status(200).json(new ApiResponse(200, { ...emptyList, freeCredits }, "No packages found"));

    // Response
    return response.status(200).json(new ApiResponse(200, { ...packages, freeCredits }, "Packages have been fetched"));
});

// Update package
const updatePackage = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { packageId } = request.params;
    if(!isValidObjectId(packageId)) throw new ApiError(400, "Invalid package ID");

    // Sanitize payload
    const { name, credits, price, description, extras } = validatePayload(createPackageValidator, request.body) || {};

    // Prevent packacge duplication
    const package = await Package.findOne({ name: { $regex: `^${name}$`, $options: "i" } }).select("_id").lean();
    if(package && String(package._id) !== String(packageId)) throw new ApiError(400, "Package with this name already exists");

    // Trigger event
    const payload = { packageId, name, credits, price, description, extras };
    packageEvent.emit("updatePackage", payload);

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "A package has been updated"));
});

module.exports = { createPackage, fetchPackages, updatePackage };