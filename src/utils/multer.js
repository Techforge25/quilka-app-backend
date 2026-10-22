const multer = require("multer");

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

module.exports = upload;