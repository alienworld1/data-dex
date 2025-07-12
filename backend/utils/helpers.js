/**
 * Utility functions for the DataDex backend
 */

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generate a unique filename with timestamp
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");

  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
}

/**
 * Validate CSV file structure
 * @param {string} content - CSV file content
 * @returns {Object} - Validation result
 */
function validateCSVStructure(content) {
  try {
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return {
        isValid: false,
        error: "CSV must contain at least a header row and one data row",
      };
    }

    const headers = lines[0].split(",");
    if (headers.length < 2) {
      return {
        isValid: false,
        error: "CSV must contain at least 2 columns",
      };
    }

    // Check for consistent column count
    const headerCount = headers.length;
    const inconsistentRows = [];

    for (let i = 1; i < Math.min(lines.length, 11); i++) {
      const columns = lines[i].split(",");
      if (columns.length !== headerCount) {
        inconsistentRows.push(i + 1);
      }
    }

    if (inconsistentRows.length > 0) {
      return {
        isValid: false,
        error: `Inconsistent column count in rows: ${inconsistentRows.join(
          ", "
        )}`,
      };
    }

    return {
      isValid: true,
      headers: headers.map((h) => h.trim()),
      rowCount: lines.length,
      columnCount: headerCount,
      sampleData: lines
        .slice(1, 6)
        .map((line) => line.split(",").map((cell) => cell.trim())),
    };
  } catch (error) {
    return {
      isValid: false,
      error: `CSV parsing error: ${error.message}`,
    };
  }
}

/**
 * Extract preview data from dataset content
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @returns {Object} - Preview data
 */
function extractPreviewData(buffer, mimeType) {
  try {
    const content = buffer.toString("utf8");

    if (mimeType === "text/csv") {
      const validation = validateCSVStructure(content);
      if (validation.isValid) {
        return {
          type: "csv",
          headers: validation.headers,
          sampleData: validation.sampleData,
          totalRows: validation.rowCount - 1, // Exclude header
          totalColumns: validation.columnCount,
          preview: validation.sampleData.slice(0, 3), // First 3 rows
        };
      }
    } else if (mimeType === "application/json") {
      const jsonData = JSON.parse(content);
      return {
        type: "json",
        structure:
          typeof jsonData === "object" ? Object.keys(jsonData) : "array",
        preview: JSON.stringify(jsonData, null, 2).substring(0, 500) + "...",
        size: Object.keys(jsonData).length,
      };
    } else if (mimeType === "text/plain") {
      const lines = content.split("\n");
      return {
        type: "text",
        totalLines: lines.length,
        preview: lines.slice(0, 10).join("\n"),
        encoding: "utf-8",
      };
    }

    return {
      type: "unknown",
      size: buffer.length,
      preview: "Preview not available for this file type",
    };
  } catch (error) {
    return {
      type: "error",
      error: error.message,
      preview: "Failed to generate preview",
    };
  }
}

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}

/**
 * Check if address is valid Aptos format
 * @param {string} address - Address to validate
 * @returns {boolean} - Is valid address
 */
function isValidAptosAddress(address) {
  const pattern = /^0x[a-fA-F0-9]{64}$/;
  return pattern.test(address);
}

/**
 * Format timestamp to ISO string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - ISO formatted date string
 */
function formatTimestamp(timestamp) {
  return new Date(parseInt(timestamp) * 1000).toISOString();
}

/**
 * Generate dataset categories for validation
 * @returns {Array} - List of valid categories
 */
function getValidCategories() {
  return [
    "sales_data",
    "customer_analytics",
    "market_research",
    "financial_data",
    "inventory_data",
    "supply_chain",
    "demographics",
    "behavioral_data",
    "economic_indicators",
    "industry_metrics",
    "social_media",
    "web_analytics",
    "other",
  ];
}

/**
 * Validate dataset category
 * @param {string} category - Category to validate
 * @returns {boolean} - Is valid category
 */
function isValidCategory(category) {
  return getValidCategories().includes(category.toLowerCase());
}

/**
 * Generate metadata hash for integrity checking
 * @param {Object} metadata - Metadata object
 * @returns {string} - Hash of metadata
 */
function generateMetadataHash(metadata) {
  const crypto = require("crypto");
  const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
  return crypto.createHash("sha256").update(metadataString).digest("hex");
}

/**
 * Parse and validate price input
 * @param {string|number} price - Price input
 * @returns {Object} - Validation result
 */
function validatePrice(price) {
  const numPrice = parseFloat(price);

  if (isNaN(numPrice)) {
    return {
      isValid: false,
      error: "Price must be a valid number",
    };
  }

  if (numPrice < 0) {
    return {
      isValid: false,
      error: "Price cannot be negative",
    };
  }

  if (numPrice > 1000000) {
    // Max 1M APT
    return {
      isValid: false,
      error: "Price cannot exceed 1,000,000 APT",
    };
  }

  return {
    isValid: true,
    price: numPrice,
    priceInOctas: Math.round(numPrice * 100000000).toString(),
  };
}

/**
 * Rate limiting key generator
 * @param {Object} req - Express request object
 * @returns {string} - Rate limiting key
 */
function generateRateLimitKey(req) {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "unknown";
  return `${ip}:${userAgent}`;
}

/**
 * Log API usage for analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
function logAPIUsage(req, res, duration) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: res.statusCode,
    duration: duration,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentLength: res.get("Content-Length") || 0,
  };

  console.log("📊 API Usage:", JSON.stringify(logData));
}

module.exports = {
  formatFileSize,
  generateUniqueFilename,
  validateCSVStructure,
  extractPreviewData,
  sanitizeFilename,
  isValidAptosAddress,
  formatTimestamp,
  getValidCategories,
  isValidCategory,
  generateMetadataHash,
  validatePrice,
  generateRateLimitKey,
  logAPIUsage,
};
