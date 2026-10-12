const { isValidObjectId } = require("mongoose");
const Book = require("../../models/bookModel");
const convertToMongoId = require("../../utils/convertToMongoId");
const { ApiError } = require("@google/genai");

const queries = {
    viewMyBook: async (_, { bookId }, { request }) => {
        const userId = request.user._id;

        // Sanitize book ID
        if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

        // Fetch
        const [book] = await Book.aggregate([
            // Match
            { $match: { _id: convertToMongoId(bookId) } },

            // Add fields to calculate characters, book length
            {
                $addFields: {
                    totalCharacters: { $sum: "$spreads.characterLimit" },
                    totalIllustrations: { $sum: "$spreads.illustrationLimit" },
                    bookLength: {
                        spreads: "$spreadsCount",
                        pages: { $multiply: ["$spreadsCount", 2] },
                    },
                }
            },

            // Add fields
            {
                $addFields: {
                    storyContent: {
                        $cond: [
                            { $eq: ["$mode", "CUSTOM"] },
                            "$txtContent",
                            "$aiContent"
                        ]
                    }
                }
            },

            // Add story parts
            {
                $addFields: {
                    storyParts: {
                        $cond: [
                            { $eq: ["$mode", "AI"] },

                            // AI story content
                            {
                                $split: [
                                    { $ifNull: ["$storyContent", ""] },
                                    "spread break"
                                ]
                            },

                            // Custom story content
                            {
                                $reduce: {
                                    input: { $ifNull: ["$spreads", []] },
                                    initialValue: {
                                        offset: 0,
                                        parts: []
                                    },
                                    in: {
                                        offset: {
                                            $add: [
                                                "$$value.offset",
                                                { $max: [0, { $ifNull: ["$$this.characterLimit", 0] }] }
                                            ]
                                        },
                                        parts: {
                                            $concatArrays: [
                                                "$$value.parts",
                                                [
                                                    {
                                                        $substrCP: [
                                                            { $ifNull: ["$storyContent", ""] },
                                                            "$$value.offset",
                                                            { $max: [0, { $ifNull: ["$$this.characterLimit", 0] }] }
                                                        ]
                                                    }
                                                ]
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

            // Extract custom story parts
            {
                $addFields: {
                    storyParts: {
                        $cond: [
                            { $eq: ["$mode", "CUSTOM"] },
                            "$storyParts.parts",
                            "$storyParts"
                        ]
                    }
                }
            },

            // Map spreads with content
            {
                $addFields: {
                    spreads: {
                        $map: {
                            input: {
                                $range: [
                                    0,
                                    { $size: { $ifNull: ["$spreads", []] } }
                                ]
                            },
                            as: "index",
                            in: {
                                $mergeObjects: [
                                    { $arrayElemAt: ["$spreads", "$$index"] },
                                    {
                                        content: {
                                            $ifNull: [
                                                { $arrayElemAt: ["$storyParts", "$$index"] },
                                                ""
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
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
                    storyContent: 1,
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
                    totalIllustrations: 1
                }
            }
        ]);

        // Validate
        if(!book) throw new ApiError(404, "Book content not found");
        if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to view this book content");

        // Exclude property
        delete book.userId;

        return book;
    }
};

// Map with resolver object
const resolvers = { queries };

module.exports = { resolvers };