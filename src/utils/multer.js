const multer = require("multer");

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (request, file, callback) => {
        // Allowed mime types
        const allowedTypes = ["image/png", "image/jpg", "image/jpeg"];
        if(!allowedTypes.includes(file.mimetype)) return callback(new Error("Only PNG, JPG and JPEG files are allowed"));
        callback(null, true);
    }
});

module.exports = upload;