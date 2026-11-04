const joi = require("joi");

// Create package validator
const createPackageValidator = joi.object({
    name: joi.string().trim().required().min(3).max(100).label("Package name"),
    credits: joi.number().integer().required().positive().label("Credits"),
    price: joi.number().required().positive().label("Price"),
    description: joi.string().trim().optional().allow(null, "").max(1000).label("Description"),
    extras: joi.string().trim().optional().allow(null, "").max(100).default(null).label("Extras")
});

module.exports = { createPackageValidator };