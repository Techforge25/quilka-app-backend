// Port and environment configuration
const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";
const isLocal = process.env.NODE_ENV === "local";

// Super admin unique ID
const superAdminId = String(process.env.SUPER_ADMIN_ID);

// Dynamic frontend URL based on node environemnt
let adminFrontendURL = null;

// Production
if(isProduction)
{
    adminFrontendURL = "https://360-gmp-front-end.vercel.app/admin";
}

// Staging
if(isStaging)
{
    adminFrontendURL = "https://360-gmp-front-end-git-staging-projects-80f407ba.vercel.app/admin";
}

// Local
if(isLocal)
{
    adminFrontendURL = "http://localhost:3000/admin";
}

// Cors options
const corsOptions = {
    origin: [adminFrontendURL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: isLocal ? false : true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 90,
    sameSite: isLocal ? "lax" : "none",
    path: "/"
};

// Empty list
const emptyList = { 
    docs: [], 
    totalPages: 0, 
    totalDocs: 0, 
    limit: 0, 
    page: 0, 
    pagingCounter: 0, 
    hasPrevPage: false, 
    hasNextPage: false, 
    prevPage: null, 
    nextPage: null 
};

// Prompt guide for AI model training
const promptGuide = ({ title, ageGroup, language, prompt, totalCharacters, spreads }) => {
        const result = spreads.map((spread, index) => {
            index++;
            const output = `Page ${index}: Character limit ${spread.characterLimit}`;
            console.log(output);
            return output;
        });

    const data = `Please read carefully! And do follow all instructions! Create an age-appropriate children’s storybook based on the following requirements. Story Requirements: Story Title: ${title}. Age Group: ${ageGroup}. Language: ${language}. Story Idea: ${prompt} Total Character Length must be less than: ${totalCharacters} characters. ${result}. Instructions: Do not add escape sequence. This is very important catch. Create an attractive and memorable title for the story if one is not provided. Write the story specifically for the selected age group. Use simple, clear, and age-appropriate vocabulary. Keep sentences short and easy to understand, especially for younger children. Divide the complete story naturally into pages.Keep the text on each page within the specified character-length range. Keep the complete story as close as possible to the requested total character length. Count character length including spaces and punctuation. Do not cut sentences abruptly just to meet the character limit. Each page should naturally continue from the previous page. Maintain consistent characters, settings, events, and story details throughout the book. Give the story a clear beginning, middle, and satisfying ending. Use repetition, playful sounds, simple dialogue, and descriptive words when appropriate for the selected age group. Keep the story warm, imaginative, engaging, and suitable for reading aloud. Avoid violent, frightening, inappropriate, or overly complicated themes. Where appropriate, include a simple positive lesson such as kindness, friendship, sharing, courage, curiosity, creativity, or caring for nature. Generated output should not include story title and page names eg: Page:1 or Page:2, just separate the pages with a word spread break`;
    return data;
};

module.exports = {
    port,
    isProduction,
    isStaging,
    isLocal,
    adminFrontendURL,
    superAdminId,
    corsOptions,
    cookieOptions,
    emptyList,
    promptGuide
};