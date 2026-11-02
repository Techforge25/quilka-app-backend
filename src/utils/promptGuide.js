const ApiError = require("./ApiError");

// Prompt guide for text generation
const promptGuideForTextGeneration = ({ title, ageGroup, language, prompt, totalCharacters, spreads }) => {
    try
    {
        const spreadWiseCharacterLimit = spreads.map((spread, index) => {
            index++;
            const output = `Page ${index}: Character limit ${spread.characterLimit}`;
            
            return output;
        });

        const data = `
        Please read carefully! And do follow all instructions! Create an age-appropriate children’s storybook based on the following requirements. Story Requirements: Story Title: ${title}. Age Group: ${ageGroup}. Language: ${language}. Story Idea: ${prompt}. 
        
        - Total Character Length must be less than: ${totalCharacters} characters. 
        
        Every page has following character limits ${spreadWiseCharacterLimit}. Each page should not exceed its respective characters limit. If page have 100 characters limit, then keep the story of that page close to 92 to 97 characters. Don't exceed and dont keep too much space between total characters of text of the page and character limit of that page.

        Instructions: Do not add escape sequence. This is very important catch. Create an attractive and memorable title for the story if one is not provided. Write the story specifically for the selected age group. Use simple, clear, and age-appropriate vocabulary. Keep sentences short and easy to understand, especially for younger children. Divide the complete story naturally into pages.Keep the text on each page within the specified character-length range. Keep the complete story as close as possible to the requested total character length. Count character length including spaces and punctuation. Do not cut sentences abruptly just to meet the character limit. Each page should naturally continue from the previous page. Maintain consistent characters, settings, events, and story details throughout the book. Give the story a clear beginning, middle, and satisfying ending. Use repetition, playful sounds, simple dialogue, and descriptive words when appropriate for the selected age group. Keep the story warm, imaginative, engaging, and suitable for reading aloud. Avoid violent, frightening, inappropriate, or overly complicated themes. The spread limits should be generated exactly to the provided limit. Where appropriate, include a simple positive lesson such as kindness, friendship, sharing, courage, curiosity, creativity, or caring for nature. Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a seperator with exact same string spread break. I am not using inverted commas on spread break just to simplify it for you. Just remember the exact word that is spread break

        VERY IMPORTANT INSTRUCTION:
        Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a seperator with exact same string spread break. I am not using inverted commas on spread break just to simplify it for you. Just remember the exact word that is spread break
        - I will use javascript built-in method split('spread break') so please don't forget to add spread break
        - This story contains total numbers of spread: ${spreads.length}
        - Keep this in my mind: ${spreadWiseCharacterLimit}
        
        CRITICAL CHARACTER LIMIT RULES — HIGHEST PRIORITY:
        1. The absolute maximum number of story characters is ${totalCharacters}.
        2. The combined character count of ALL generated story pages MUST NEVER exceed ${totalCharacters}.
        3. Count EVERY character, including letters, spaces, punctuation, numbers, and symbols.
        4. This story contains total ${spreads.length} pages.
        5. Character limits for each page: ${spreadWiseCharacterLimit}.
        6. If page have 100 characters limit, then keep the story of that page close to 92 to 97 characters.
        `;
        return data;
    }
    catch(error)
    {
        console.log(error.message);
        throw new ApiError(400, "Failed to generate prompt for text generation");
    }
};

// Prompt guide for text regeneration
const promptGuideForTextRegeneration = ({ title, ageGroup, language, previousStory, prompt, totalCharacters, spreads }) => {
    try
    {
        const spreadWiseCharacterLimit = spreads.map((spread, index) => {
            index++;
            const output = `Page ${index}: Character limit ${spread.characterLimit}`;
            
            return output;
        });

        const data = `Please read carefully! And do follow all instructions! Create an age-appropriate children’s storybook based on the following requirements. Story Requirements: Story Title: ${title}. Age Group: ${ageGroup}. Language: ${language}. Previously, you generated this story ${previousStory}. So now, please regenerate it with my new idea. New Story Idea: ${prompt}.
        
        - Total Character Length must be less than: ${totalCharacters} characters.

        Every page has following character limits ${spreadWiseCharacterLimit}. Instructions: Do not add escape sequence. This is very important catch. Create an attractive and memorable title for the story if one is not provided. Write the story specifically for the selected age group. Use simple, clear, and age-appropriate vocabulary. Keep sentences short and easy to understand, especially for younger children. Divide the complete story naturally into pages.Keep the text on each page within the specified character-length range. Keep the complete story as close as possible to the requested total character length. Count character length including spaces and punctuation. Do not cut sentences abruptly just to meet the character limit. Each page should naturally continue from the previous page. Maintain consistent characters, settings, events, and story details throughout the book. Give the story a clear beginning, middle, and satisfying ending. Use repetition, playful sounds, simple dialogue, and descriptive words when appropriate for the selected age group. Keep the story warm, imaginative, engaging, and suitable for reading aloud. Avoid violent, frightening, inappropriate, or overly complicated themes. The spread limits should be generated exactly to the provided limit. Where appropriate, include a simple positive lesson such as kindness, friendship, sharing, courage, curiosity, creativity, or caring for nature. Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a seperator with exact same string spread break. I am not using inverted commas on spread break just to simplify it for you. Just remember the exact word that is spread break

        VERY IMPORTANT INSTRUCTION:
        Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a seperator with exact same string spread break. I am not using inverted commas on spread break just to simplify it for you. Just remember the exact word that is spread break
        - I will use javascript built-in method split('spread break') so please don't forget to add spread break
        - This story contains total numbers of spread: ${spreads.length}
        - Keep this in my mind: ${spreadWiseCharacterLimit}

        CRITICAL CHARACTER LIMIT RULES — HIGHEST PRIORITY:
        1. The absolute maximum number of story characters is ${totalCharacters}.
        2. The combined character count of ALL generated story pages MUST NEVER exceed ${totalCharacters}.
        3. Count EVERY character, including letters, spaces, punctuation, numbers, and symbols.
        4. This story contains total ${spreads.length} pages.
        5. Character limits for each page: ${spreadWiseCharacterLimit}.
        6. If page have 100 characters limit, then keep the story of that page close to 92 to 97 characters.        
        `;
        return data;
    }
    catch(error)
    {
        console.log(error.message);
        throw new ApiError(400, "Failed to generate prompt for text regeneration");
    }
};

// Prompt guide for custom story refinement
const promptGuideForCustomStoryRefinement = ({ title, ageGroup, language, previousStory, instruction, totalCharacters, spreads }) => {
    try
    {
        const spreadWiseCharacterLimit = spreads.map((spread, index) => {
            index++;
            const output = `Page ${index}: Character limit ${spread.characterLimit}`;
            
            return output;
        });

        const data = `Please read carefully! And do follow all instructions! I have created an age-appropriate children’s storybook based on the following requirements. Story Requirements: Story Title: ${title}. Age Group: ${ageGroup}. Language: ${language}. I just need a refinement of this story: ${previousStory}. 
        
        - Please refine it with this instruction: "${instruction}".
        
        - Total Character Length must be less than: ${totalCharacters} characters.

        Every page has following character limits ${spreadWiseCharacterLimit}. Instructions: Do not add escape sequence. This is very important catch. Write the story specifically for the selected age group. Use simple, clear, and age-appropriate vocabulary. Keep sentences short and easy to understand, especially for younger children. Divide the complete story naturally into pages. Keep the complete story as close as possible to the requested total character length. Count character length including spaces and punctuation. Do not cut sentences abruptly just to meet the character limit. Maintain consistent characters, settings, events, and story details throughout the book. Give the story a clear beginning, middle, and satisfying ending. Use repetition, playful sounds, simple dialogue, and descriptive words when appropriate for the selected age group. Keep the story warm, imaginative, engaging, and suitable for reading aloud. Avoid violent, frightening, inappropriate, or overly complicated themes. The spread limits should be generated exactly to the provided limit. Where appropriate, include a simple positive lesson such as kindness, friendship, sharing, courage, curiosity, creativity, or caring for nature. 
        
        VERY IMPORTANT INSTRUCTION:
        Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a seperator with exact same string spread break. I am not using inverted commas on spread break just to simplify it for you. Just remember the exact word that is spread break
        - I will use javascript built-in method split('spread break') so please don't forget to add spread break
        - This story contains total numbers of spread: ${spreads.length}
        - Keep this in my mind: ${spreadWiseCharacterLimit}

        CRITICAL CHARACTER LIMIT RULES — HIGHEST PRIORITY:
        1. The absolute maximum number of story characters is ${totalCharacters}.
        2. The combined character count of ALL generated story pages MUST NEVER exceed ${totalCharacters}.
        3. Count EVERY character, including letters, spaces, punctuation, numbers, and symbols.`;
        return data;
    }
    catch(error)
    {
        console.log(error.message);
        throw new ApiError(400, "Failed to generate prompt for custom story refinement");
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
        - Absolutely NO text, NO dialogue, NO typography, NO sound effect lettering, and NO speech bubbles. Pure visual illustration only.

        HIGHEST PRIORITY: STRICT CHARACTER CONSISTENCY

        Character consistency is the most important requirement throughout the entire story. Every recurring character MUST maintain exactly the same visual identity across all illustrations.

        1. PRESERVE EVERY CHARACTER DETAIL:
        - Maintain the exact same face, facial structure, eye shape, eye color, nose, mouth, ears, and other distinctive features.
        - Maintain the same skin, fur, feather, or body color.
        - Maintain the same hairstyle, hair color, hair texture, length, and overall appearance.
        - Maintain the same clothing, outfit colors, patterns, shoes, and accessories.
        - Maintain the same body proportions, size, age, and recognizable physical characteristics.
        - Preserve every distinctive detail that makes a character recognizable.

        2. REFERENCE IMAGES ARE THE VISUAL SOURCE OF TRUTH:
        If reference images are provided through fileData, carefully examine and analyze EVERY reference image before generating the illustration.

        - Pay close attention to even the smallest visual details of each character.
        - Identify each recurring character and accurately preserve their appearance.
        - Carefully observe colors, facial features, clothing, textures, proportions, hairstyles, accessories, and other distinctive characteristics.
        - Reproduce the established character designs as accurately as possible.
        - Do not casually reinterpret, redesign, simplify, or alter any character.
        - Never ignore visual details from the reference images simply because they are not explicitly mentioned in the current story text.

        3. NO UNNECESSARY APPEARANCE CHANGES:
        A character's appearance MUST NOT change between illustrations.
        For example, a red teddy bear must remain red, a brown horse must remain brown, and a character wearing a blue sweater must continue wearing the same blue sweater.

        3.5. STRICT CHARACTER IDENTITY SEPARATION — NAME-BY-NAME ANALYSIS:

        Before generating the illustration, carefully identify and distinguish EVERY character by their specific name.

        - Treat every unique character name as a separate and independent character identity.
        - Analyze the story and reference images name by name. Identify exactly which visual appearance belongs to which named character.
        - NEVER assume that two characters are the same person or creature simply because they have similar descriptions, appearances, ages, genders, roles, or clothing.
        - Two different names MUST represent two visually distinct character identities unless the story explicitly establishes that they are the same character, such as through a nickname, alias, or an explicitly stated identity.
        - For example, "Usman" and "Raiyan" MUST be treated as two separate characters. Never give them the same face, facial structure, hairstyle, or overall appearance.
        - Each named character must retain their own unique facial identity and recognizable visual characteristics throughout the entire story.
        - Do not transfer one character's face, hairstyle, clothing, colors, accessories, or physical characteristics to another character.
        - When multiple characters appear together in the same illustration, ensure that each one is individually recognizable and visually distinguishable from the others.
        - Carefully match each character in the current scene to their correct name and corresponding reference appearance.
        - Never reuse a previously established character design for a different named character just to maintain visual consistency.

        IMPORTANT IDENTITY RULE:
        Character consistency applies WITHIN each character's own identity, NOT across different characters.

        For example:
        - Usman must always look like Usman.
        - Raiyan must always look like Raiyan.
        - If both appear in the same scene, they MUST have clearly distinct faces and individual appearances.
        - Usman's established appearance must never be assigned to Raiyan, and Raiyan's established appearance must never be assigned to Usman.

        If a character has no reference image yet, create an original, visually distinct appearance for that specific name. Once established, preserve that appearance in all subsequent illustrations.

        FINAL IDENTITY CHECK:
        Before generating each illustration, identify every named character appearing in the scene. Verify that each character is matched to the correct identity and that no two different characters have accidentally inherited the same face or visual design.


        Never randomly change a character's colors, clothes, hairstyle, facial features, body proportions, or other established characteristics.

        4. STORY-REQUIRED CHANGES ONLY:
        Changes to a character's appearance are permitted ONLY when they are explicitly necessary for the story.
        For example, if the story specifically requires a character to wear a raincoat, costume, or different outfit, make only that necessary change.
        All other established visual characteristics MUST remain unchanged.
        Once a temporary story-required change is no longer relevant, return to the character's established original appearance.

        5. DISTINGUISH CHARACTERS FROM SCENE CHANGES:
        Characters may change their pose, facial expression, body position, movement, and interaction according to the story.
        Backgrounds, environments, lighting, weather, camera angles, and composition may also change.
        However, these changes MUST NEVER alter a character's established visual identity.

        6. HANDLE MISSING DETAILS CAREFULLY:
        If a character's appearance is not explicitly described in the current story text, use the reference images and previously established character appearance as the definitive guide.
        Never invent a different appearance or assume that an unmentioned detail can be changed freely.

        7. FINAL CONSISTENCY CHECK:
        Before generating each illustration, compare every recurring character against the provided reference images and their established appearance.
        Verify that their face, colors, clothing, hairstyle, proportions, and distinctive features remain consistent.
        Correct any unintended differences before producing the final illustration.

        FINAL RULE:
        Visual consistency is more important than creative reinterpretation. You may creatively adapt the scene, composition, poses, and expressions, but NEVER sacrifice character identity or established appearance for artistic variation.        
    `;
        return data;
};

// Prompt for front image
const promptGuideForFrontImage = ({ bookTitle, content, illustrationStyle, size }) => {
    const data = `A flat, borderless, full-bleed 2D digital illustration of a single-page children's picture book FRONT COVER in ${illustrationStyle} style for the book titled "${bookTitle}".

    Canvas Size & Single-Page Orientation Logic:
    - Full Spread Reference Size: ${size}.
    - Target Output Dimensions: Calculate the exact canvas ratio by taking the width of (${size}) DIVIDED BY 2, keeping the exact height of (${size}).
    - This represents ONE single closed cover page (half the width of the full spread ${size}), rendered in a strict vertical/single-page orientation.
    - 100% Edge-to-Edge Viewport: The illustration must completely fill the entire output image frame from top-to-bottom and left-to-right. Zero outer margins, zero padding, and zero background space outside the cover.

    Front Cover Typography & Layout:
    - Prominent Book Title: Render the exact text "${bookTitle}" prominently at the top-to-center area.
    - Typography Style: Bold, charming, whimsical storybook title lettering with playful curves, subtle dimensional depth, and vibrant colors that pop cleanly against the artwork.

    Hero Cover Illustration & Subject:
    ${content}

    Cover Art Direction & Composition:
    - Commercial children's book cover aesthetic: Eye-catching poster layout with a strong central hero focal point filling the single-page width.
    - Dynamic interaction: The characters and environment naturally frame the title text while extending all the way out to the raw edges of the image file.
    - Visual Style: ${illustrationStyle} with rich storybook textures, radiant lighting, clean depth, and a polished finish.

    Strict Constraints & Negative Directives:
    - Render ONLY the exact specified title "${bookTitle}". Absolutely NO random gibberish letters, NO placeholder text, and NO speech bubbles.
    - FLAT 2D ARTWORK ONLY: Do NOT generate a 3D book mockup, do NOT show a book sitting on a table or background, do NOT draw a book spine, and do NOT add white borders or frames. The artwork itself must touch all 4 edges of the generated image.`;
    return data;  
};

// Prompt for cover image
const promptGuideForCoverImage = ({ authorName, content, illustrationStyle, size }) => {
    const data = `
    A flat, borderless, full-bleed 2D digital illustration of a single-page children's picture book BACK COVER in ${illustrationStyle} style matching the story world of:
    ${content}

    Important Instructions:
    - The provided content may be either a complete children's story or a custom illustration prompt supplied by the user.
    - If the content is a complete story, understand its characters, setting, atmosphere, and overall theme. Create a visually appealing back cover illustration that reflects the story's world without reproducing a specific scene unnecessarily.
    - If the content is a custom prompt, interpret it as the user's creative direction and generate the illustration accordingly.
    - Do not treat instructions, descriptions, or prompt guidelines as text that must appear in the illustration.
    - Do not include the words "Back Cover Illustration", "Hero Cover Illustration", or any instructional text in the artwork.
    - Prefer an illustration without text. Only include a short, original, minimalist quote if it genuinely enhances the composition and is appropriate to the story.
    - Maintain a cohesive visual style, consistent characters, and a child-friendly atmosphere.
    - Ensure the artwork fills the entire canvas without borders, frames, margins, or mockup elements.

    Canvas Size & Single-Page Orientation Logic (STRICT & HIGHEST PRIORITY):
    - Full Spread Reference Size: ${size}.
    - Target Output Dimensions: Calculate the exact canvas ratio by taking the width of (${size}) DIVIDED BY 2, keeping the exact height of (${size}).
    - This represents ONE single back cover page ( strictly half the width of the full spread ${size}), rendered as a single-page layout.
    - 100% Edge-to-Edge Viewport: The illustration must completely fill the entire output image frame from edge to edge. Zero outer margins, zero padding, and zero background space outside the cover.

    Back Cover Layout & Graphic Design Elements:
    - Story Blurb Block: Neatly framed, legible story summary text in the center area for the book: ${content}. Only if the content sounds like a story. If it sounds like a custom prompt supplied by the user then ignore. And write your own quotes as a summary based on the prompt.
    - Author Credit: Neatly displayed credit near the bottom: "Written by ${authorName}".
    - Commercial Publishing Details: Include a small, clean rectangular white barcode/ISBN box neatly aligned in the bottom corner.

    Background Illustration & Spot Art:
    - A cohesive, gentle environment illustration from the story world (${content}) extending across the entire canvas to all four edges while framing the central text gracefully.
    - Soft, readable contrast behind the text area so all cover typography remains crisp and clear.

    Visual Art Style:
    - ${illustrationStyle} with identical color palette, lighting warmth, and paper textures as the front cover.

    Strict Constraints & Negative Directives:
    - Render ONLY the specified blurb text and "Written by ${authorName}".
    - Absolutely NO unreadable gibberish, NO messy placeholder scribbles, and NO speech bubbles.
    - FLAT 2D ARTWORK ONLY: Do NOT generate a 3D book mockup, do NOT show a book sitting on a background or surface, do NOT draw a book spine, and do NOT add white borders or frames. The illustration must touch all 4 raw edges of the generated image.`;
    return data;
};

module.exports = { promptGuideForTextGeneration, promptGuideForTextRegeneration, promptGuideForIllustration, 
promptGuideForCustomStoryRefinement, promptGuideForFrontImage, promptGuideForCoverImage };