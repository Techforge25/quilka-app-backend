const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { getCache, setCache } = require("../../redis/redisHelpers");
const { emptyList } = require("../../constants");
const User = require("../../models/userModel");
const getDateFilter = require("../../utils/dateFilter");

// Fetch users
const fetchUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "", status, dateRange = "all" } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(dateRange);

    // Get from cache
    const key = `users:page:${page}:limit:${limit}:search:${String(search).toLowerCase()}:status:${status}:dateRange:${dateRange}`;
    let users = await getCache(key);
    if(!users)
    {
        // Base filter
        const baseFilter = {};
        if(status && !["pending", "active", "suspended"].includes(status)) throw new ApiError(400, "Invalid status filter");
        if(status) baseFilter.status = status;

        // Get from db
        users = await User.aggregatePaginate([
            // Match
            { $match: { ...baseFilter, ...dateFilter } },

            // Match by user full name
            ...(search ? [
                { $match: { fullName: { $regex: String(search).toLowerCase(), $options: "i" } } }
            ] : []),

            // Lookup book
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "userId",
                    as: "books",
                    pipeline: [{ $project: { title: 1 } }]
                }
            },

            // Lookup revenue generations
            {
                $lookup: {
                    from: "revenuegenerations",
                    localField: "_id",
                    foreignField: "userId",
                    as: "revenuegenerations",
                    pipeline: [{ $project: { revenue: 1 } }]
                }
            },            

            // Sort
            { $sort: { createdAt: -1 } },

            // Projection
            {
                $project: {
                    fullName: 1,
                    email: 1,
                    createdAt: 1,
                    totalBooks: { $size: "$books" },
                    totalSpend: { $sum: "$revenuegenerations.revenue" },
                    status: 1,
                }
            }
        ], { page, limit });

        // Set in cache
        await setCache(key, users, 60);
    }
    if(!users.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No user details found"));

    // Response
    return response.status(200).json(new ApiResponse(200, users, "Users have been fetched"));
});

module.exports = { fetchUsers };