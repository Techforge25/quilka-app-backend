const { isValidObjectId } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { promptGuideForIllustration } = require("../utils/promptGuide");
const { uploadToCloudinary } = require("../utils/cloudinary");
const llm = require("../service/llmService");
const Book = require("../models/bookModel");
const validatePayload = require("../utils/validatePayload");
const { createIllustrationValidator, updateSpreadSublayoutValidator, uploadManualIllustrationValidator, 
generateWithCustomPromptValidator } = require("../validators/illustrationValidator");

// Create illustration
const createIllustration = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Sanitize payload
    const { content } = validatePayload(createIllustrationValidator, request.body) || {};

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Find spread
    const spread = book.spreads.id(spreadId);
    if(!spread) throw new ApiError(404, "Spread not found");

    // Get previous image url
    const previousImageURL = book.spreads.find((spread) => spread?.illustrationURL !== null);

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to create illustration for this book");
    if(book.status !== "draft") throw new ApiError(403, "The illustration generation with AI cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be created in draft stage 2");

    // Generate dynamic prompt
    const prompt = promptGuideForIllustration({
        illustrationStyle: book.illustrationStyle,
        content,
        size: spread.illustrationSize.size,
        aspectRatio: spread.illustrationSize.aspectRatio
    });

    // Generate illustration
    const illustrationResponse = await llm.generateStoryIllustration(prompt, "gemini-3.1-flash-image", previousImageURL?.illustrationURL);

    // Extract generated image buffer and token consumption count
    const { imageBuffer, totalTokenCount } = illustrationResponse;
    console.log("Total Token", totalTokenCount);

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Get secure URL
    const illustrationURL = uploadResult.secure_url;

    // Save illustration to specific spread
    spread.illustrationURL = illustrationURL;
    await book.save();

    // Response
    return response.status(201).json(new ApiResponse(201, { illustration: illustrationURL }, "Illustration has been created"));
});

// Upload manual illustration
const uploadManualIllustration = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Sanitize payload
    const { illustrationURL } = validatePayload(uploadManualIllustrationValidator, request.body) || {};

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Find spread
    const spread = book.spreads.id(spreadId);
    if(!spread) throw new ApiError(404, "Spread not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to upload illustration for this book");
    if(book.status !== "draft") throw new ApiError(403, "The illustration uploading cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be uploaded in draft stage 2");

    // Save illustration to specific spread
    spread.illustrationURL = illustrationURL;
    await book.save();

    // Response
    return response.status(201).json(new ApiResponse(201, { illustration: illustrationURL }, "Illustration has been uploaded"));
});

// Generate illustration with custom prompt
const generateWithCustomPrompt = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Sanitize payload
    const { customPrompt, referenceImageURL } = validatePayload(generateWithCustomPromptValidator, request.body) || {};

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Find spread
    const spread = book.spreads.id(spreadId);
    if(!spread) throw new ApiError(404, "Spread not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to generate illustration for this book");
    if(book.status !== "draft") throw new ApiError(403, "The illustration generation cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be generated in draft stage 2");

    // Generate dynamic prompt
    const prompt = promptGuideForIllustration({
        illustrationStyle: book.illustrationStyle,
        content: customPrompt,
        size: spread.illustrationSize.size,
        aspectRatio: spread.illustrationSize.aspectRatio
    });

    // Generate illustration
    const illustrationResponse = await llm.generateIllustrationWithCustomPrompt(prompt, referenceImageURL, "gemini-3.1-flash-image");

    // Extract generated image buffer and token consumption count
    const { imageBuffer, totalTokenCount } = illustrationResponse;
    console.log("Total Token", totalTokenCount);

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Get secure URL
    const illustrationURL = uploadResult.secure_url;

    // Save illustration to specific spread
    spread.illustrationURL = illustrationURL;
    await book.save();

    // Response
    return response.status(201).json(new ApiResponse(201, { illustration: illustrationURL }, "Illustration has been generated with custom prompt"));
});

// Update spread sublayout
const updateSpreadSublayout = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Sanitize payload
    const { textColor, textBgColor, subLayoutDirection } = validatePayload(updateSpreadSublayoutValidator, request.body) || {};    

    // Find book
    const book = await Book.findById(bookId);
    if(!book) throw new ApiError(404, "Book not found");

    // Find spread
    const spread = book.spreads.id(spreadId);
    if(!spread) throw new ApiError(404, "Spread not found");

    // Validate
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized update text and text bg color");
    if(book.status !== "draft") throw new ApiError(403, "Text color and text bg color cannot be updated while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Text color and text bg color cannot be updated while the book is not in draft stage 2");

    // Save to db
    spread.textColor = textColor;
    spread.textBgColor = textBgColor;
    spread.subLayoutDirection = subLayoutDirection;
    await book.save();

    // Response
    return response.status(200).json(new ApiResponse(200, { textColor, textBgColor }, "Spread has been updated"));
});

module.exports = { createIllustration, uploadManualIllustration, 
updateSpreadSublayout, generateWithCustomPrompt };