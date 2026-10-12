const { ApolloServer } = require("@apollo/server");
const { Book } = require("./book");

// Initialize apollo server
const apolloServer = new ApolloServer({
    typeDefs: `
        ${Book.typeDefs}

        type Query {
            fetchBooks: String
        }
    `,

    resolvers:{
        Query: {

        },
    }
});

module.exports = apolloServer;