const { ApolloServer } = require("@apollo/server");
const { Book } = require("./book");

// Initialize apollo server
const apolloServer = new ApolloServer({
    typeDefs: `
        ${Book.typeDefs}

        type Query {
            ${Book.queries}
        }
    `,

    resolvers: {
        Query: {
            ...Book.resolvers.queries
        },
    }
});

module.exports = apolloServer;