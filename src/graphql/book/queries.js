const queries = `
    viewMyBook(bookId: ID!): Book!
    fetchMyBooks(page: Int, limit: Int, search: String, status: String): BookPagination
`;

module.exports = { queries }; 