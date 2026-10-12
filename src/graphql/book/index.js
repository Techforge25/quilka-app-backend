const { typeDefs } = require("./typeDefs");
const { queries } = require("./queries");
const { resolvers } = require("./resolvers");

// Grouped with Book
const Book = { typeDefs, queries, resolvers };

module.exports = { Book };