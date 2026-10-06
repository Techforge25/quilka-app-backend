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

// Allowed illustration styles
const allowedIllustrationStyles = [
    "Watercolor", 
    "Soft Storybook", 
    "Cartoon", 
    "3D Animated", 
    "Whimiscal"
];

// Allowed book sizes
const allowedBookSizes = [
    "Large Square 8.5in x 8.5in", 
    "Square 8in x 8in", 
    "Portrait 8in x 10in", 
    "Large Portrait 8.5in x 11in", 
    "Compact Portrait 7in x 10in", 
    "Landscape 10in x 8in"
];

// Allowed illustration sizes
const allowedIllustrationSizes = [
    "Large Square 8.5in x 8.5in", 
    "Square 8in x 8in", 
    "Portrait 8in x 10in", 
    "Large Portrait 8.5in x 11in", 
    "Compact Portrait 7in x 10in", 
    "Landscape 10in x 8in"
];

// Allowed text sizes
const allowedTextSizes = [
    "20px",
    "30px",
    "40px"
];

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
    allowedIllustrationStyles,
    allowedBookSizes,
    allowedIllustrationSizes,
    allowedTextSizes
};