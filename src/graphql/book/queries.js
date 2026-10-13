const queries = `
    viewMyBook(bookId: ID!): ViewBook!
    fetchMyBooks(page: Int, limit: Int, search: String, status: String): BookPagination
`;

module.exports = { queries }; 