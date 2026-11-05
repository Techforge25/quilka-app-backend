const multer = require("multer");

// Allowed mime types
const allowedTypes = ["image/png", "image/jpg", "image/jpeg"];

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (request, file, callback) => {
        if(!allowedTypes.includes(file.mimetype))
        {
            throw new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
        }
        callback(null, true);
    },
    
});

module.exports = upload;