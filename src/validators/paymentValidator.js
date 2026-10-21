const joi = require("joi");

// Pay for book validator
const payForBookValidator = joi.object({
    price: joi.number().positive().required().label("Price"),
    paymentGateway: joi.string().trim().required().valid("Apple Pay", "Google Pay").label("Payment gateway"),
    transactionId: joi.string().trim().required().label("Transaction ID")
});

// Pay for regeneration validator
const payForRegenerationValidator = joi.object({
    packageId: joi.string().trim().length(24).required().label("Package ID"),
    price: joi.number().positive().required().label("Price"),
    paymentGateway: joi.string().trim().required().valid("Apple Pay", "Google Pay").label("Payment gateway"),
    transactionId: joi.string().trim().required().label("Transaction ID")
});

module.exports = { payForBookValidator, payForRegenerationValidator };