const typeDefs = `
    type IllustrationSize {
        size: String!
        aspectRatio: String!
    }

    type Spread {
        mainLayoutName: String!
        subLayoutDirection: String!
        characterLimit: Int!
        illustrationLimit: Int!
        illustrationSize: IllustrationSize!
        textSize: String!
        textColor: String!
        textBgColor: String!
        illustrationURL: String
        content: String
    }

    type BookLength {
        spreads: Int!
        pages: Int!
    }

    type ViewBook {
        bookId: ID!
        mode: String!
        status: String!
        draftStage: Int!
        title: String!
        authorName: String!
        spreadsCount: Int!
        prompt: String
        ageGroup: String!
        bookSize: String!
        spreadSize: String!
        textStyle: String!
        illustrationStyle: String!
        illustrationSize: IllustrationSize!
        language: String!
        frontImage: String
        backImage: String
        spreads: [Spread!]!
        bookLength: BookLength!
        totalCharacters: Int!
        totalIllustrations: Int!
        price: Int!
    }

    type MyBook {
        bookId: ID!
        mode: String!
        status: String!
        draftStage: Int!
        title: String!
        authorName: String!
        spreadsCount: Int!
        pages: Int!
        language: String!
        frontImage: String
        backImage: String
        totalCharacters: Int!
        totalIllustrations: Int!
    }

    type BookPagination {
        docs: [MyBook]
        totalDocs: Int!
        totalPages: Int!
        page: Int!
        limit: Int!
        hasPrevPage: Boolean!
        hasNextPage: Boolean!
        prevPage: Int
        nextPage: Int
    }     
`;

module.exports = { typeDefs };