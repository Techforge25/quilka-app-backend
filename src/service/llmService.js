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
    async generateStoryText(aiModel = "gemini-3.8-flash", dynamicPrompt)
    {
        try
        {
            const storyResponse = await this.ai.models.generateContent({ model: aiModel, contents: dynamicPrompt });    
            const aiContent = storyResponse.text;
            return aiContent;
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