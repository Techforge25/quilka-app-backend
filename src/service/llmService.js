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
            console.log("Failed to generate prompt for text generation", error.message);
            return null;
        }
    }    
}

// Object
const llm = new LLMService();

module.exports = llm;