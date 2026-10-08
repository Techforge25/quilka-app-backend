const { isValidObjectId } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { promptGuideForIllustration } = require("../utils/promptGuide");
const { uploadToCloudinary } = require("../utils/cloudinary");
const llm = require("../service/llmService");

// Create illustration
const createIllustration = asyncHandler(async (request, response) => {
    // Sanitize Book ID
    const { bookId } = request.params;
    if(!isValidObjectId(bookId)) throw new ApiError(400, "Invalid Book ID");

    // Generate illustration
    const illustrationResponse = await llm.generateStoryIllustration(promptGuideForIllustration(), "gemini-3.1-flash-image");
    if(!illustrationResponse) throw new ApiError(400, "Failed to generate illustration! Please write appropriate prompt.");

    // Extract generated image buffer and token consumption count
    const { imageBuffer, totalTokenCount } = illustrationResponse;
    console.log("Total Token", totalTokenCount);

    // Upload to cloudinary
    const uploadResult = await uploadToCloudinary(imageBuffer);
    if(!uploadResult) throw new ApiError(500, "Failed to upload to cloudinary");
    
    // Grab the production-ready secure public URL
    const cloudinaryUrl = uploadResult.secure_url;
    console.log("Image URL", cloudinaryUrl);

    // Response
    return response.status(200).json(new ApiResponse(200, { illustration: cloudinaryUrl }, "Illustration has been created"));
});

module.exports = { createIllustration };