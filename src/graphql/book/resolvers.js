const { isValidObjectId } = require("mongoose");
const Book = require("../../models/bookModel");
const convertToMongoId = require("../../utils/convertToMongoId");
const { ApiError } = require("@google/genai");
const ApiResponse = require("../../utils/ApiResponse");
const { emptyList } = require("../../constants");

const queries = {
    // View book
    viewMyBook: async (_, { bookId }, { request }) => {
        const userId = request.user._id;

        // Sanitize book ID
        if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

        // Fetch
        const [book] = await Book.aggregate([
            // Match
            { $match: { _id: convertToMongoId(bookId) } },
            
            // Lookup spreads
            {
                $lookup: {
                    from: "spreads",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "spreads",
                    pipeline:[{ $project: { mainLayoutName: 1, subLayoutDirection: 1, 
                    characterLimit: 1, illustrationLimit: 1, illustrationSize: 1, 
                    textSize: 1, textColor: 1, textBgColor: 1, illustrationURL: 1, content: 1, } }]
                }
            },

            // Add fields to calculate characters, illustrations and book length
            {
                $addFields: {
                    totalCharacters: { $sum: "$spreads.characterLimit" },
                    totalIllustrations: { $sum: "$spreads.illustrationLimit" },
                    bookLength: {
                        spreads: "$spreadsCount",
                        pages: { $multiply: ["$spreadsCount", 2] },
                    },
                    price: { $multiply: ["$spreadsCount", 2] }
                }
            },

            // Projection
            {
                $project: {
                    userId: 1,
                    bookId: "$_id",
                    mode: 1,
                    status: 1,
                    draftStage: 1,
                    title: 1,
                    authorName: 1,
                    frontImage: 1,
                    backImage: 1,
                    spreadsCount: 1,
                    prompt: 1,
                    ageGroup: 1,
                    bookSize: 1,
                    spreadSize: 1,
                    textStyle: 1,
                    illustrationStyle: 1,
                    language: 1,
                    spreads: 1,
                    bookLength: 1,
                    totalCharacters: 1,
                    totalIllustrations: 1,
                    price: 1
                }
            }
        ]);

        // Validate
        if(!book) throw new ApiError(404, "Book content not found");
        if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to view this book content");

        // Exclude property
        delete book.userId;

        return book;
    },

    // Fetch my books
    fetchMyBooks: async (_, { page = 1, limit = 10, search = "", status = "all" }, { request, response }) => {
        const userId = convertToMongoId(request.user._id);

        // Sanitize status key
        if(status && !["all", "draft", "published"].includes(status)) throw new ApiError(400, "Invalid book status provided");

        // Base filter
        const baseFilter = {};
        if(search) baseFilter.title = { $regex: search, $options: "i" };

        // Status filter
        if(status.toLowerCase() === "all")
        {
            baseFilter.status = { $in: ["draft", "published"] };
        }
        else
        {
            baseFilter.status = status;
        }

        // Fetch
        const books = await Book.aggregatePaginate([
            // Match
            { $match: { userId, ...baseFilter } },

            // Lookup spreads
            {
                $lookup: {
                    from: "spreads",
                    localField: "_id",
                    foreignField: "bookId",
                    as: "spreads"
                }
            },

            // Sort
            { $sort: { updatedAt: -1 } },

            // Projection
            {
                $project: {
                    bookId: "$_id",
                    mode: 1,
                    status: 1,
                    draftStage: 1,
                    title: 1,
                    spreadsCount: 1,
                    language: 1,
                    authorName: 1,
                    frontImage: 1,
                    backImage: 1,
                    totalCharacters: { $sum: "$spreads.characterLimit" },
                    totalIllustrations: { $sum: "$spreads.illustrationLimit" },
                    pages: { $multiply: ["$spreadsCount", 2] }
                }
            }
        ], { page, limit });        
        if(!books.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No books found"));

        return books;
    }
};

// Map with resolver object
const resolvers = { queries };

module.exports = { resolvers };