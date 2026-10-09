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

// Prompt for front image
const promptGuideForFrontImage = ({ bookTitle, content, illustrationStyle, size }) => {
    const data = `
    A complete, professional children's picture book FRONT COVER design in ${illustrationStyle} style for the book titled "${bookTitle}".
    Front Cover Typography & Layout:
    - Prominent Book Title: Render the title text "${bookTitle}" prominently at the top-to-center area.
    - Typography Style: Bold, charming, whimsical storybook title lettering with playful curves, subtle dimensional depth, and vibrant colors that pop against the background.

    Hero Cover Illustration & Subject:
    ${content}

    Cover Art Direction & Composition:
    - Commercial children's book cover aesthetic: Eye-catching poster layout with a strong central hero focal point designed to stand out on a bookstore display.
    - Dynamic interaction: The characters and environment should frame and complement the title text naturally.
    - Canvas Specifications: Exactly ${size} (width x height in px), full-bleed, edge-to-edge vertical portrait format.

    Visual Style:
    - ${illustrationStyle} with rich storybook textures, radiant lighting, clean depth, and polished finish.

    Strict Constraints:
    - Render ONLY the exact specified title ${bookTitle}. Absolutely NO random gibberish letters, NO messy placeholder text, and NO speech bubbles.
    - Completely borderless and marginless canvas.    
    `;
    return data;  
};

// Prompt for cover image
const promptGuideForCoverImage = ({ bookTitle, authorName, content, illustrationStyle, size }) => {
    const data = `
    A complete, professional children's picture book BACK COVER design in ${illustrationStyle} style matching the story world of:
    ${content}

    Back Cover Layout & Graphic Design Elements:

    - Story Blurb Block: Neatly framed, legible story summary text in the middle for the book ${content}.
    - Author Credit: Neatly displayed credit at the bottom: "Written by ${authorName}".
    - Commercial Publishing Details: Include a small, clean rectangular white barcode/ISBN box neatly aligned in the bottom corner to give an authentic commercial book finish.

    Background Illustration & Spot Art:
    - A cohesive, gentle environment illustration from the story world (${content}) framing the text gracefully.
    - The illustration should use soft, readable contrast so all cover typography remains crisp and clear.

    Canvas & Print Specifications:
    - Target Dimensions: Exactly ${size} (width x height in px), vertical portrait orientation.
    - Full-bleed, edge-to-edge layout with balanced margins.

    Visual Art Style:
    - ${illustrationStyle} with identical color palette, lighting warmth, and paper textures as the front cover.

    Strict Constraints:
    - Render ONLY the specified text, the blurb, and "Written by ${authorName}").
    - Absolutely NO unreadable gibberish, NO messy placeholder scribbles, and NO speech bubbles.
    - Completely borderless and marginless canvas.    
    `;
    return data;
};

module.exports = { promptGuideForTextGeneration, promptGuideForIllustration, 
promptGuideForFrontImage, promptGuideForCoverImage };