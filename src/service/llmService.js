const { GoogleGenAI } = require("@google/genai");

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

    // Generate story text
    async generateStoryText(dynamicPrompt, aiModel = "gemini-3.5-flash")
    {
        try
        {
            const storyResponse = await this.ai.models.generateContent({ contents: dynamicPrompt, model: aiModel });
            if(!storyResponse) return null;

            // Extract story text
            const aiContent = storyResponse.text;

            // Extract token counts
            const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = storyResponse.usageMetadata;
            return { aiContent, promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount };            
        }
        catch(error)
        {
            console.log("Failed to generate prompt for text generation", error.message);
            return null;
        }
    }

    // Generate story illustration
    async generateStoryIllustration(dynamicPrompt, aiModel = "gemini-3.1-flash-image")
    {
        try
        {
            // Generate illustration
            const illustrationResponse = await this.ai.models.generateContent({
                contents: dynamicPrompt,
                model: aiModel,
                config: { responseModalities: ["IMAGE"] },
                thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
            });
            if(!illustrationResponse) return null;
            
            // Find generated image
            const imagePart = illustrationResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            if(!imagePart?.inlineData?.data) return null;

            // Convert base64 image to buffer
            const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
            if(!imageBuffer) return null;

            // Extract token counts
            const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = illustrationResponse.usageMetadata;
            return { imageBuffer, promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount };
        }
        catch(error)
        {
            console.log("Failed to generate prompt for illustration generation", error.message);
            return null;
        }
    }

    // Generate front and cover images
    async generateFrontAndCoverImages(frontPrompt, coverPrompt, aiModel = "gemini-3.1-flash-image")
    {
        try
        {
            // Generate parallel
            const [frontResponse, coverResponse] = await Promise.all([
                // Front
                this.ai.models.generateContent({
                    contents: frontPrompt,
                    model: aiModel,
                    config: { responseModalities: ["IMAGE"] },
                    thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
                }),

                // Cover
                this.ai.models.generateContent({
                    contents: coverPrompt,
                    model: aiModel,
                    config: { responseModalities: ["IMAGE"] },
                    thinkingConfig: { thinkingLevel: "High", includeThoughts: true }
                }),
            ]);
            if(!frontResponse) return null;
            if(!coverResponse) return null;

            // Find generated images
            const frontImagePart = frontResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            const coverImagePart = coverResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
            if(!frontImagePart?.inlineData?.data) return null;
            if(!coverImagePart?.inlineData?.data) return null;

            // Convert base64 images to buffer
            const frontImageBuffer = Buffer.from(frontImagePart.inlineData.data, "base64");
            const coverImageBuffer = Buffer.from(coverImagePart.inlineData.data, "base64");
            if(!frontImageBuffer) return null;
            if(!coverImageBuffer) return null;

            // Extract token counts
            const { totalTokenCount: frontTotalTokenCount } = frontResponse.usageMetadata;
            const { totalTokenCount: coverTotalTokenCount } = coverResponse.usageMetadata;
            return { frontImageBuffer, coverImageBuffer, totalTokenCount: frontTotalTokenCount + coverTotalTokenCount };
        }
        catch(error)
        {
            console.log("Failed to generate prompt for front and cover generation", error.message);
            return null;
        }
    }    
}

// Object
const llm = new LLMService();

module.exports = llm;