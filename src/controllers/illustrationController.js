const { isValidObjectId } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { promptGuideForIllustration } = require("../utils/promptGuide");
const { uploadToCloudinary } = require("../utils/cloudinary");
const llm = require("../service/llmService");
const Book = require("../models/bookModel");
const validatePayload = require("../utils/validatePayload");
const { updateSpreadSublayoutValidator, uploadManualIllustrationValidator, 
generateWithCustomPromptValidator } = require("../validators/illustrationValidator");
const Spread = require("../models/spreadModel");
const { getReferenceImage } = require("../utils/getReferenceImage");
const Regeneration = require("../models/regenerationModel");
const { startSession } = require("mongoose");
const { deleteCacheByPattern } = require("../redis/redisHelpers");

// Create illustration
const createIllustration = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Find book, spread and reference images urls  
    const [book, spread, referenceImages] = await Promise.all([
        Book.findById(bookId).select("userId status draftStage illustrationStyle").lean(),
        Spread.findById(spreadId).select("content characterLimit illustrationSize illustrationURL base64Image"),
        Spread.find({ bookId }).select("-_id base64Image").lean()
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(!spread) throw new ApiError(404, "Spread not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to create illustration for this book");
    if(book.status !== "draft") throw new ApiError(403, "The illustration generation with AI cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be created in draft stage 2");

    // Pass to regeneration controller
    if(spread.illustrationURL)
    {
        request.book = book;
        request.spread = spread;
        request.referenceImages = referenceImages;
        return next();
    }

    // Generate dynamic prompt
    const prompt = promptGuideForIllustration({
        illustrationStyle: book.illustrationStyle,
        content: spread.content,
        size: spread.illustrationSize.size,
        aspectRatio: spread.illustrationSize.aspectRatio
    });

    // Get previous images if exists
    const previousReferenceImages = referenceImages.filter(ref => ref.base64Image).map(url => url.base64Image);

    // Generate illustration
    const illustrationResponse = await llm.generateStoryIllustration(prompt, "gemini-3.1-flash-image", previousReferenceImages);

    // Extract generated image buffer
    const { imageBuffer } = illustrationResponse;

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Get secure URL
    const illustrationURL = uploadResult.secure_url;

    // Fetch reference image
    const base64Image = await getReferenceImage(illustrationURL);
    if(!base64Image) throw new ApiError(500, "Failed to process reference image");

    // Save to db
    spread.illustrationURL = illustrationURL;
    spread.base64Image = base64Image;
    await spread.save();
    await deleteCacheByPattern(`books:${bookId}*`);

    // Response
    return response.status(201).json(new ApiResponse(201, { illustration: illustrationURL }, "Illustration has been created"));
});

// Regenerate illustration
const regenerateIllustraton = asyncHandler(async (request, response) => {
    // Get metadata
    const userId = request.user._id;
    const { bookId } = request.params;
    const { book, spread, referenceImages } = request;

    // Find regenerations
    const regeneration = await Regeneration.findOne({ userId, bookId });

    // Validate
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You've reached your regeneration limit. Please purchase more to continue");

    // Generate dynamic prompt
    const prompt = promptGuideForIllustration({
        illustrationStyle: book.illustrationStyle,
        content: spread.content,
        size: spread.illustrationSize.size,
        aspectRatio: spread.illustrationSize.aspectRatio
    });

    // Get previous images if exists
    const previousReferenceImages = referenceImages.filter(ref => ref.base64Image).map(url => url.base64Image);

    // Generate illustration
    const illustrationResponse = await llm.generateStoryIllustration(prompt, "gemini-3.1-flash-image", previousReferenceImages);

    // Extract generated image buffer
    const { imageBuffer } = illustrationResponse;

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Get secure URL
    const illustrationURL = uploadResult.secure_url;

    // Fetch reference image
    const base64Image = await getReferenceImage(illustrationURL);
    if(!base64Image) throw new ApiError(500, "Failed to process reference image");

    // Start transactional queries
    const dbSession = await startSession();
    try
    {
        dbSession.startTransaction();

        // Save to db
        spread.illustrationURL = illustrationURL;
        spread.base64Image = base64Image;
        await spread.save({ session: dbSession });
        await Regeneration.updateOne(
            { userId, bookId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        );

        // Commit transaction
        await dbSession.commitTransaction();
        await deleteCacheByPattern(`books:${bookId}*`);
    }
    catch(error)
    {
        await dbSession.abortTransaction();
        throw new ApiError(500, error.message);
    }
    finally
    {
        dbSession.endSession();
    }

    // Payload
    const payload = {
        illustration: illustrationURL, 
        regenerations: regeneration.limit -1
    };

    // Response
    return response.status(201).json(new ApiResponse(201, payload, "Illustration has been regenerated"));
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

    // Find book and spread
    const [book, spread] = await Promise.all([
        Book.findById(bookId).select("userId status draftStage").lean(),
        Spread.findById(spreadId).select("illustrationURL")
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(!spread) throw new ApiError(404, "Spread not found");
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to upload illustration for this book");
    if(book.status !== "draft") throw new ApiError(403, "The illustration uploading cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be uploaded in draft stage 2");

    // Save to db
    spread.illustrationURL = illustrationURL;
    await spread.save();
    await deleteCacheByPattern(`books:${bookId}*`);

    // Response
    return response.status(201).json(new ApiResponse(201, { illustration: illustrationURL }, "Illustration has been uploaded"));
});

// Generate illustration with custom prompt
const generateWithCustomPrompt = asyncHandler(async (request, response, next) => {
    const userId = request.user._id;

    // Sanitize Book and spread ID
    const { bookId, spreadId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");
    if(!isValidObjectId(spreadId)) throw new ApiError(400, "Invalid Spread ID");

    // Sanitize payload
    const { customPrompt, referenceImageURL } = validatePayload(generateWithCustomPromptValidator, request.body) || {};

    // Find book and spread
    const [book, spread] = await Promise.all([
        Book.findById(bookId).select("userId status draftStage illustrationStyle").lean(),
        Spread.findById(spreadId).select("illustrationSize illustrationURL base64Image")
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(!spread) throw new ApiError(404, "Spread not found");    
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to generate illustration for this book");
    if(book.status !== "draft") throw new ApiError(403, "The illustration generation cannot be proceeded while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Illustration can only be generated in draft stage 2");

    // Pass to rengerate with custom prompt controller
    if(spread.illustrationURL)
    {
        request.book = book;
        request.spread = spread;
        request.payload = { customPrompt, referenceImageURL };
        return next();
    }

    // Generate dynamic prompt
    const prompt = promptGuideForIllustration({
        illustrationStyle: book.illustrationStyle,
        content: customPrompt,
        size: spread.illustrationSize.size,
        aspectRatio: spread.illustrationSize.aspectRatio
    });

    // Generate illustration
    const illustrationResponse = await llm.generateIllustrationWithCustomPrompt(prompt, referenceImageURL, "gemini-3.1-flash-image");

    // Extract generated image buffer
    const { imageBuffer } = illustrationResponse;

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Get secure URL
    const illustrationURL = uploadResult.secure_url;

    // Fetch reference image
    const base64Image = await getReferenceImage(illustrationURL);
    if(!base64Image) throw new ApiError(500, "Failed to process reference image");        

    // Save to db
    spread.illustrationURL = illustrationURL;
    spread.base64Image = base64Image;
    await spread.save();
    await deleteCacheByPattern(`books:${bookId}*`);

    // Response
    return response.status(201).json(new ApiResponse(201, { illustration: illustrationURL }, "Illustration has been generated with custom prompt"));
});

// Regenerate illustration with custom prompt
const regenerateWithCustomPrompt = asyncHandler(async (request, response) => {
    // Get metadata
    const userId = request.user._id;
    const { bookId } = request.params;
    const { book, spread } = request;
    const { customPrompt, referenceImageURL } = request.payload;

    // Find regenerations
    const regeneration = await Regeneration.findOne({ userId, bookId });

    // Validate
    if(!regeneration) throw new ApiError(404, "Regenerations not found for this book");
    if(regeneration.limit <= 0) throw new ApiError(403, "You've reached your regeneration limit. Please purchase more to continue");    

    // Generate dynamic prompt
    const prompt = promptGuideForIllustration({
        illustrationStyle: book.illustrationStyle,
        content: customPrompt,
        size: spread.illustrationSize.size,
        aspectRatio: spread.illustrationSize.aspectRatio
    });

    // Generate illustration
    const illustrationResponse = await llm.generateIllustrationWithCustomPrompt(prompt, referenceImageURL, "gemini-3.1-flash-image");

    // Extract generated image buffer
    const { imageBuffer } = illustrationResponse;

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Get secure URL
    const illustrationURL = uploadResult.secure_url;

    // Fetch reference image
    const base64Image = await getReferenceImage(illustrationURL);
    if(!base64Image) throw new ApiError(500, "Failed to process reference image");     

    // Start transactional queries
    const dbSession = await startSession();
    try
    {
        dbSession.startTransaction();

        // Save to db
        spread.illustrationURL = illustrationURL;
        spread.base64Image = base64Image;
        await spread.save({ session: dbSession });
        await Regeneration.updateOne(
            { userId, bookId, limit: { $gt: 0 } },
            { $inc: { limit: -1 } },
            { session: dbSession }
        );

        // Commit transaction
        await dbSession.commitTransaction();
        await deleteCacheByPattern(`books:${bookId}*`);
    }
    catch(error)
    {
        await dbSession.abortTransaction();
        throw new ApiError(500, error.message);
    }
    finally
    {
        dbSession.endSession();
    }

    // Payload
    const payload = {
        illustration: illustrationURL,
        regenerations: regeneration.limit -1
    };

    // Response
    return response.status(201).json(new ApiResponse(201, payload, "Illustration has been regenerated with custom prompt"));
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

    // Find book and spread
    const [book, spread] = await Promise.all([
        Book.findById(bookId).select("userId status draftStage").lean(),
        Spread.findById(spreadId).select("textColor textBgColor subLayoutDirection")
    ]);

    // Validate
    if(!book) throw new ApiError(404, "Book not found");
    if(!spread) throw new ApiError(404, "Spread not found"); 
    if(String(userId) !== String(book.userId)) throw new ApiError(403, "You are not authorized to update text and text bg color");
    if(book.status !== "draft") throw new ApiError(403, "Text color and text bg color cannot be updated while the book is not in draft state");
    if(book.draftStage !== 2) throw new ApiError(403, "Text color and text bg color cannot be updated while the book is not in draft stage 2");

    // Save to db
    spread.textColor = textColor;
    spread.textBgColor = textBgColor;
    spread.subLayoutDirection = subLayoutDirection;
    await spread.save();
    await deleteCacheByPattern(`books:${bookId}*`);

    // Response
    return response.status(200).json(new ApiResponse(200, { textColor, textBgColor, subLayoutDirection }, "Spread has been updated"));
});

module.exports = { createIllustration, regenerateIllustraton, uploadManualIllustration, 
updateSpreadSublayout, generateWithCustomPrompt, regenerateWithCustomPrompt };