const joi = require("joi");

// Admin login validator
const adminLoginValidator = joi.object({
    username: joi.string().trim().lowercase().required().label("Username"),
    password: joi.string().trim().required().label("Password")
});

module.exports = { adminLoginValidator };