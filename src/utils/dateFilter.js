const ApiError = require("./ApiError");

// Allowed date filters
const allowedDateFilters = ["all", "7d", "1m", "6m", "1y"];

// Helper function to implement date range
const getDateFilter = (request, fieldName = "createdAt") => {
    // Date filter
    const { dateRange = "all" } = request.query;
    if(!allowedDateFilters.includes(dateRange)) throw new ApiError(400, "Invalid date range");

    // Date filter
    const dateFilter = {};

    if(dateRange !== "all")
    {
        // Calculate date
        const startDate = new Date();

        if(dateRange === "7d") startDate.setDate(startDate.getDate() - 7);
        if(dateRange === "1m") startDate.setMonth(startDate.getMonth() - 1);
        if(dateRange === "6m") startDate.setMonth(startDate.getMonth() - 6);
        if(dateRange === "1y") startDate.setMonth(startDate.getMonth() - 12);

        // Inject date range
        dateFilter[fieldName] = { $gte: startDate };
    }

    return { dateFilter };
};

module.exports = getDateFilter;