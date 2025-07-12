const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for direct IPFS upload

const fileFilter = (req, file, cb) => {
  const allowedTypes = (
    process.env.ALLOWED_FILE_TYPES || "text/csv,application/json,text/plain"
  ).split(",");

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
    files: 1, // Only allow one file at a time
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          error: "File too large",
          message: `Maximum file size: ${Math.round(
            (parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024
          )}MB`,
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          error: "Too many files",
          message: "Only one file is allowed per upload",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          error: "Unexpected file field",
          message: 'File field name must be "dataFile"',
        });
      default:
        return res.status(400).json({
          error: "Upload error",
          message: err.message,
        });
    }
  } else if (err) {
    return res.status(400).json({
      error: "Upload error",
      message: err.message,
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError,
};
