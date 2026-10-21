const joi = require("joi");

// Payment validator
const paymentValidator = joi.object({
    price: joi.number().positive().required().label("Price"),
    paymentGateway: joi.string().trim().required().valid("Apple Pay", "Google Pay").label("Payment gateway"),
    transactionId: joi.string().trim().required().label("Transaction ID")
});

module.exports = { paymentValidator };