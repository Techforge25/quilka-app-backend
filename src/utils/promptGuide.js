// Prompt guide for AI model training (Text-based generation)
const promptGuideForTextGeneration = ({ title, ageGroup, language, prompt, totalCharacters, spreads }) => {
    try
    {
        const spreadWiseCharacterLimit = spreads.map((spread, index) => {
            index++;
            const output = `Page ${index}: Character limit ${spread.characterLimit}`;
            return output;
        });

        const data = `Please read carefully! And do follow all instructions! Create an age-appropriate children’s storybook based on the following requirements. Story Requirements: Story Title: ${title}. Age Group: ${ageGroup}. Language: ${language}. Story Idea: ${prompt} Total Character Length must be less than: ${totalCharacters} characters. ${spreadWiseCharacterLimit}. Instructions: Do not add escape sequence. This is very important catch. Create an attractive and memorable title for the story if one is not provided. Write the story specifically for the selected age group. Use simple, clear, and age-appropriate vocabulary. Keep sentences short and easy to understand, especially for younger children. Divide the complete story naturally into pages.Keep the text on each page within the specified character-length range. Keep the complete story as close as possible to the requested total character length. Count character length including spaces and punctuation. Do not cut sentences abruptly just to meet the character limit. Each page should naturally continue from the previous page. Maintain consistent characters, settings, events, and story details throughout the book. Give the story a clear beginning, middle, and satisfying ending. Use repetition, playful sounds, simple dialogue, and descriptive words when appropriate for the selected age group. Keep the story warm, imaginative, engaging, and suitable for reading aloud. Avoid violent, frightening, inappropriate, or overly complicated themes. Where appropriate, include a simple positive lesson such as kindness, friendship, sharing, courage, curiosity, creativity, or caring for nature. Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a word spread break`;
        return data;
    }
    catch(error)
    {
        console.log("Failed to generate prompt for text generation", error.message);
        return null;
    }
};

// Prompt guide for illustration
const promptGuideForIllustration = () => {
    const data = `
        A children’s storybook illustration, whimsical digital painting of: [They sit together on the soft green grass. Look at the book! It has beautiful, bright pictures. There is a happy yellow sun in the sky. There is a little blue fish in the water. Splash, splash! "I love the fish," says Duck. "I love the sun," says Rabbit. They turn the page together. Turn, turn, turn. What do they see next? A bouncy green frog! "Ribbit, ribbit," says the frog. Rabbit and Duck laugh. Reading together is so much fun!].
        [Layout & Size Composition Guide]:
        - Target Aspect Ratio: 1: and object-fit: 'cover' (Optimized for width: 370px height: 148px).

        Style: High-quality 3D Animated.

        Strict Technical Constraints: A completely borderless, edge-to-edge illustration. Absolutely NO text, NO labels, NO speech bubbles, NO words, and NO margins.`;
        return data;
};

module.exports = { promptGuideForTextGeneration, promptGuideForIllustration };