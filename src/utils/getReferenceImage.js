const ApiError = require("./ApiError");

const getReferenceImage = async (referenceImageURL) => {
    try
    {
        // Fetch reference image
        const imageResponse = await fetch(referenceImageURL);
        if(!imageResponse.ok) throw new ApiError(500, "Failed to fetch reference image");

        // Convert image to base64
        const base64Image = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
        return base64Image;
    }
    catch(error)
    {
        throw new ApiError(500, error.message);
    }    
};

module.exports = { getReferenceImage };