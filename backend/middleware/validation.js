const Joi = require("joi");

// Validation schemas
const schemas = {
  uploadDataset: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).max(1000).required(),
    category: Joi.string().min(2).max(50).required(),
    price: Joi.number().min(0).required(),
  }),

  purchaseDataset: Joi.object({
    datasetId: Joi.number().integer().min(1).required(),
    buyerAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{64}$/)
      .required(),
  }),

  accountAddress: Joi.object({
    address: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{64}$/)
      .required(),
  }),

  datasetId: Joi.object({
    id: Joi.number().integer().min(1).required(),
  }),
};

/**
 * Generic validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 * @returns {Function} - Express middleware function
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        error: "Validation failed",
        details: errorDetails,
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
}

/**
 * File upload validation middleware
 */
function validateFileUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded",
      message: "Please select a file to upload",
    });
  }

  const file = req.file;
  const allowedTypes = (
    process.env.ALLOWED_FILE_TYPES || "text/csv,application/json,text/plain"
  ).split(",");
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      error: "Invalid file type",
      message: `Allowed file types: ${allowedTypes.join(", ")}`,
      received: file.mimetype,
    });
  }

  // Check file size
  if (file.size > maxSize) {
    return res.status(400).json({
      error: "File too large",
      message: `Maximum file size: ${Math.round(maxSize / 1024 / 1024)}MB`,
      received: `${Math.round(file.size / 1024 / 1024)}MB`,
    });
  }

  // Check if file is empty
  if (file.size === 0) {
    return res.status(400).json({
      error: "Empty file",
      message: "Uploaded file is empty",
    });
  }

  next();
}

/**
 * Validate Aptos address format
 */
function validateAptosAddress(req, res, next) {
  const address = req.params.address || req.body.address || req.query.address;

  if (!address) {
    return res.status(400).json({
      error: "Missing address",
      message: "Aptos address is required",
    });
  }

  // Check if address is in the correct format (0x followed by 64 hex characters)
  const addressPattern = /^0x[a-fA-F0-9]{64}$/;
  if (!addressPattern.test(address)) {
    return res.status(400).json({
      error: "Invalid Aptos address",
      message:
        "Address must be in format: 0x followed by 64 hexadecimal characters",
      received: address,
    });
  }

  next();
}

/**
 * Validate dataset ID
 */
function validateDatasetId(req, res, next) {
  const id = req.params.id || req.body.datasetId || req.query.datasetId;

  if (!id) {
    return res.status(400).json({
      error: "Missing dataset ID",
      message: "Dataset ID is required",
    });
  }

  const datasetId = parseInt(id);
  if (isNaN(datasetId) || datasetId <= 0) {
    return res.status(400).json({
      error: "Invalid dataset ID",
      message: "Dataset ID must be a positive integer",
      received: id,
    });
  }

  // Store the parsed ID for later use
  req.datasetId = datasetId;
  next();
}

/**
 * CSV file content validation
 */
function validateCSVContent(req, res, next) {
  if (!req.file || req.file.mimetype !== "text/csv") {
    return next(); // Skip validation if not a CSV file
  }

  try {
    const content = req.file.buffer.toString("utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({
        error: "Invalid CSV file",
        message: "CSV file must contain at least a header row and one data row",
      });
    }

    // Check for basic CSV structure (comma-separated values)
    const headerColumns = lines[0].split(",").length;
    if (headerColumns < 2) {
      return res.status(400).json({
        error: "Invalid CSV format",
        message: "CSV file must contain at least 2 columns",
      });
    }

    // Validate that all rows have the same number of columns
    const invalidRows = [];
    for (let i = 1; i < Math.min(lines.length, 11); i++) {
      // Check first 10 data rows
      const columns = lines[i].split(",").length;
      if (columns !== headerColumns) {
        invalidRows.push(i + 1);
      }
    }

    if (invalidRows.length > 0) {
      return res.status(400).json({
        error: "Invalid CSV structure",
        message: `Inconsistent number of columns in rows: ${invalidRows.join(
          ", "
        )}`,
      });
    }

    // Store CSV metadata for later use
    req.csvMetadata = {
      totalRows: lines.length,
      totalColumns: headerColumns,
      headers: lines[0].split(",").map((h) => h.trim()),
      sampleData: lines
        .slice(1, 6)
        .map((line) => line.split(",").map((cell) => cell.trim())),
    };

    next();
  } catch (error) {
    return res.status(400).json({
      error: "CSV parsing error",
      message: "Failed to parse CSV file content",
      details: error.message,
    });
  }
}

module.exports = {
  validate,
  validateFileUpload,
  validateAptosAddress,
  validateDatasetId,
  validateCSVContent,
  schemas,
};
