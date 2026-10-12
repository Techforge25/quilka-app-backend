const queries = {
    viewMyBook: (_, { bookId }) => {
        return `Hello there ${bookId}`;
    }
};

// Map with resolver object
const resolvers = { queries };

module.exports = { resolvers };