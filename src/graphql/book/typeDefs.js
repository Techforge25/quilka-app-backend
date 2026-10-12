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
    }

    type Book {
        _id: ID!
        mode: String!
        status: String!
        draftStage: Int!
        title: String!
        authorName: String!
        spreadsCount: Int!
        storyContent: String!
        prompt: String
        ageGroup: String!
        bookSize: String!
        spreadSize: String!
        textStyle: String!
        illustrationStyle: String!
        language: String!
        frontImage: String
        backImage: String
        spreads: [Spread!]!
    }
`;

module.exports = { typeDefs };