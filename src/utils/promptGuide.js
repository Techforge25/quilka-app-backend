// Prompt guide for AI model training (Text-based generation)
const promptGuideForTextGeneration = ({ title, ageGroup, language, prompt, totalCharacters, spreads }) => {
    try
    {
        const spreadWiseCharacterLimit = spreads.map((spread, index) => {
            index++;
            const output = `Page ${index}: Character limit ${spread.characterLimit}`;
            
            return output;
        });

        const data = `Please read carefully! And do follow all instructions! Create an age-appropriate children’s storybook based on the following requirements. Story Requirements: Story Title: ${title}. Age Group: ${ageGroup}. Language: ${language}. Story Idea: ${prompt} Total Character Length must be less than: ${totalCharacters} characters. Every page has following character limits ${spreadWiseCharacterLimit}. Instructions: Do not add escape sequence. This is very important catch. Create an attractive and memorable title for the story if one is not provided. Write the story specifically for the selected age group. Use simple, clear, and age-appropriate vocabulary. Keep sentences short and easy to understand, especially for younger children. Divide the complete story naturally into pages.Keep the text on each page within the specified character-length range. Keep the complete story as close as possible to the requested total character length. Count character length including spaces and punctuation. Do not cut sentences abruptly just to meet the character limit. Each page should naturally continue from the previous page. Maintain consistent characters, settings, events, and story details throughout the book. Give the story a clear beginning, middle, and satisfying ending. Use repetition, playful sounds, simple dialogue, and descriptive words when appropriate for the selected age group. Keep the story warm, imaginative, engaging, and suitable for reading aloud. Avoid violent, frightening, inappropriate, or overly complicated themes. The spread limits should be generated exactly to the provided limit. Where appropriate, include a simple positive lesson such as kindness, friendship, sharing, courage, curiosity, creativity, or caring for nature. Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a seperator with exact same string spread break. I am not using inverted commas on spread break just to simplify it for you. Just remember the exact word that is spread break`;
        return data;
    }
    catch(error)
    {
        console.log("Failed to generate prompt for text generation", error.message);
        return null;
    }
};

// Prompt guide for illustration
const promptGuideForIllustration = ({ content, illustrationStyle, size, aspectRatio }) => {
    const data = `
        A children’s book illustration in ${illustrationStyle} style depicting the scene:
        ${content}

        Dimensions & Canvas Specifications:
        - Target Dimensions: Exactly ${size} (width x height in px).
        - Aspect Ratio: ${aspectRatio} orientation.
        - Framing: Full-bleed, edge-to-edge illustration structured to fit a ${size} container with zero outer padding or white space.
        - Composition Safe-Zone: Center key subjects with balanced breathing room around the edges to ensure no elements are clipped when rendered.

        Visual Art Style:
        - ${illustrationStyle} with rich detailing, coherent textures, and an expressive storybook aesthetic.

        Strict Constraints:
        - Completely borderless, full-bleed, edge-to-edge canvas.
        - Absolutely NO text, NO dialogue, NO typography, NO sound effect lettering, and NO speech bubbles. Pure visual illustration only.`;
        return data;
};

module.exports = { promptGuideForTextGeneration, promptGuideForIllustration };