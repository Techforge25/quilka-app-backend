const { GoogleGenAI } = require("@google/genai");
const ApiError = require("../utils/ApiError");

// LLM Service
class LLMService
{
    // Construct properties
    GEMINI_API_KEY;
    ai;

    // Initialize constructor
    constructor()
    {
        // AI instance
        this.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        this.ai = new GoogleGenAI({ apiKey: this.GEMINI_API_KEY });
    }

    // Generate / Regenerate story text
    async generateStoryText(dynamicPrompt, aiModel = "gemini-3.5-flash")
    {
        try
        {
            const storyResponse = await this.ai.models.generateContent({ contents: dynamicPrompt, model: aiModel });
            if(!storyResponse) throw new ApiError(500, "Failed to generate story text! Please provide appropriate prompt");

            // Extract story text
            const aiContent = storyResponse.text;
            if(!aiContent)
            {
                const { blockReason } = storyResponse.promptFeedback;
                throw new ApiError(400, `LLM failed to generate story text. Block reason: ${blockReason}`);
            }

            // Extract token counts
            const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = storyResponse.usageMetadata;
            return { aiContent, promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount };       
        }
        catch(error)
        {
            throw error;
        }
    }

    // Generate / Regenerate story illustration
    async generateStoryIllustration(dynamicPrompt, aiModel = "gemini-3.1-flash-image", previousReferenceImagesURLs = [], userProvidedReference = null)
    { 
        try
        {
            // Initialize contents with text
            const contents = [{ text: dynamicPrompt }];

            // Add user provided reference image url if provided
            if(userProvidedReference)
            {
                contents.push({ fileData: { mimeType: "image/jpg", fileUri: userProvidedReference } });
            }
            else
            {
                if(previousReferenceImagesURLs.length)
                {
                    for(const previousReferenceImageUrl of previousReferenceImagesURLs)
                    {
                        // Append reference image url
                        contents.push({ fileData: { mimeType: "image/jpg", fileUri: previousReferenceImageUrl } });
                    }
                }
            }

            // Generate illustration
            const illustrationResponse = await this.ai.models.generateContent({
                model: aiModel,
                contents,
                config: { responseModalities: ["IMAGE"] },
                thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
            });
            
            // Find generated image
            const imagePart = illustrationResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            if(!imagePart?.inlineData?.data) throw new ApiError(500, "Inline data is missing");

            // Download base64 image
            const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
            if(!imageBuffer) throw new ApiError(500, "Failed to download base64 image");

            // Extract token counts
            const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = illustrationResponse.usageMetadata;
            return { imageBuffer, promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount };
        }
        catch(error)
        {
            throw error;
        }
    }

    // Generate / Regenerate front and cover images
    async generateFrontAndCoverImages(frontPrompt, coverPrompt, aiModel = "gemini-3.1-flash-image", referenceImagesURLs = [])
    {
        try
        {
            // Initialize front and cover contents with text
            const frontImageContents = [{ text: frontPrompt }];
            const coverImageContents = [{ text: coverPrompt }];
            if(referenceImagesURLs.length)
            {
                for(const referenceImageURL of referenceImagesURLs)
                {
                    // Append image references
                    frontImageContents.push({ fileData: { mimeType: "image/jpg", fileUri: referenceImageURL } });
                    coverImageContents.push({ fileData: { mimeType: "image/jpg", fileUri: referenceImageURL } });
                }
            }

            // Generate parallel
            const [frontResponse, coverResponse] = await Promise.all([
                // Front
                this.ai.models.generateContent({
                    contents: frontImageContents,
                    model: aiModel,
                    config: { responseModalities: ["IMAGE"] },
                    thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
                }),

                // Cover
                this.ai.models.generateContent({
                    contents: coverImageContents,
                    model: aiModel,
                    config: { responseModalities: ["IMAGE"] },
                    thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
                }),
            ]);
            if(!frontResponse) throw new ApiError(500, "Failed to generate front image");
            if(!coverResponse) throw new ApiError(500, "Failed to generate cover image");

            // Find generated images
            const frontImagePart = frontResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            const coverImagePart = coverResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            if(!frontImagePart?.inlineData?.data) throw new ApiError(500, "Inline data of front image is missing");
            if(!coverImagePart?.inlineData?.data) throw new ApiError(500, "Inline data of cover image is missing");

            // Download base64 images
            const frontImageBuffer = Buffer.from(frontImagePart.inlineData.data, "base64");
            const coverImageBuffer = Buffer.from(coverImagePart.inlineData.data, "base64");
            if(!frontImageBuffer) throw new ApiError(500, "Failed to download base64 front image");
            if(!coverImageBuffer) throw new ApiError(500, "Failed to download base64 cover image");

            // Extract Front Tokens
            const { 
                promptTokenCount: frontPromptTokenCount,
                candidatesTokenCount: frontCandidatesTokenCount,
                thoughtsTokenCount: frontThoughtsTokenCount,
                totalTokenCount: frontTotalTokenCount
            } = frontResponse.usageMetadata;

            // Extract Cover Tokens
            const { 
                promptTokenCount: coverPromptTokenCount,
                candidatesTokenCount: coverCandidatesTokenCount,
                thoughtsTokenCount: coverThoughtsTokenCount,
                totalTokenCount: coverTotalTokenCount 
            } = coverResponse.usageMetadata;

            return {
                frontImageBuffer, 
                coverImageBuffer, 
                promptTokenCount: frontPromptTokenCount + coverPromptTokenCount,
                candidatesTokenCount: frontCandidatesTokenCount + coverCandidatesTokenCount,
                thoughtsTokenCount: frontThoughtsTokenCount + coverThoughtsTokenCount,
                totalTokenCount: frontTotalTokenCount + coverTotalTokenCount
            };
        }
        catch(error)
        {
            throw error;
        }
    }

    // Generate / Regenerate front or cover image with custom prompt
    async generateFrontOrCoverImageWithCustomPrompt(dynamicPrompt, aiModel = "gemini-3.1-flash-image", previousReferenceImagesURLs = [], userProvidedReference = null)
    {
        try
        {
            // Initialize contents
            const contents = [{ text: dynamicPrompt }];

            // Add user provided reference image if provided
            if(userProvidedReference)
            {
                contents.push({ fileData: { mimeType: "image/jpg", fileUri: userProvidedReference } });
            }
            else
            {
                for(const previousReferenceImageURL of previousReferenceImagesURLs)
                {
                    // Append previous images
                    contents.push({ fileData: { mimeType: "image/jpg", fileUri: previousReferenceImageURL } });
                }
            }

            // Generate illustration
            const illustrationResponse = await this.ai.models.generateContent({
                model: aiModel,
                contents,
                config: { responseModalities: ["IMAGE"] },
                thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
            });
            if(!illustrationResponse) throw new ApiError(500, "Failed to generate illustration");
            
            // Find generated image
            const imagePart = illustrationResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            if(!imagePart?.inlineData?.data) throw new ApiError(500, "Inline data is missing");

            // Download base64 image
            const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
            if(!imageBuffer) throw new ApiError(500, "Failed to download base64 image");

            // Extract token counts
            const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = illustrationResponse.usageMetadata;
            return { imageBuffer, promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount };            
        }
        catch(error)
        {
            throw error;
        }        
    }
}

// Object
const llm = new LLMService();

module.exports = llm;