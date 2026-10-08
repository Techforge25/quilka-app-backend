const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload to cloudinary
const uploadToCloudinary = async (imageBuffer) => {
    // Parameters
    const paramters = { folder: "nano_banana_generations", resource_type: "image" };    
    const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(paramters, (error, result) => {
                if(error) return reject(error);
                resolve(result);
            }
        );

        uploadStream.end(imageBuffer);
    });
    if(!uploadResult) return null;
    return uploadResult;
};

module.exports = { uploadToCloudinary };