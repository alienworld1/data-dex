const express = require("express");
const router = express.Router();

const ipfsService = require("../services/ipfsService");
const aptosService = require("../services/aptosService");
const { upload, handleMulterError } = require("../config/multer");
const {
  validateFileUpload,
  validateCSVContent,
  validate,
  schemas,
} = require("../middleware/validation");

/**
 * POST /api/upload/file
 * Upload a file to IPFS and return the hash
 */
router.post(
  "/file",
  upload.single("dataFile"),
  handleMulterError,
  validateFileUpload,
  validateCSVContent,
  async (req, res) => {
    try {
      const file = req.file;
      const { originalname, buffer, mimetype, size } = file;

      console.log(`📤 Processing file upload: ${originalname}`);

      // Prepare metadata
      const metadata = {
        originalName: originalname,
        mimeType: mimetype,
        fileSize: size,
        uploadedBy: req.body.uploaderAddress || "unknown",
        uploadTimestamp: new Date().toISOString(),
      };

      // Add CSV-specific metadata if available
      if (req.csvMetadata) {
        metadata.csvData = req.csvMetadata;
      }

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadFile(
        buffer,
        originalname,
        metadata
      );

      res.json({
        success: true,
        message: "File uploaded to IPFS successfully",
        data: {
          ipfsHash: ipfsResult.ipfsHash,
          metadataHash: ipfsResult.metadataHash,
          fileName: ipfsResult.fileName,
          fileSize: ipfsResult.fileSize,
          ipfsUrl: ipfsResult.ipfsUrl,
          metadataUrl: ipfsResult.metadataUrl,
          metadata: ipfsResult.metadata,
        },
      });
    } catch (error) {
      console.error("❌ File upload error:", error);
      res.status(500).json({
        success: false,
        error: "File upload failed",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/upload/dataset
 * Upload dataset metadata to both IPFS and Aptos marketplace
 */
router.post(
  "/dataset",
  upload.single("dataFile"),
  handleMulterError,
  validateFileUpload,
  validateCSVContent,
  validate(schemas.uploadDataset),
  async (req, res) => {
    try {
      const file = req.file;
      const { title, description, category, price } = req.body;
      const uploaderAddress = req.body.uploaderAddress;

      console.log(`📤 Processing dataset upload: ${title}`);

      // Validate uploader address if provided
      if (uploaderAddress && !/^0x[a-fA-F0-9]{64}$/.test(uploaderAddress)) {
        return res.status(400).json({
          success: false,
          error: "Invalid uploader address format",
        });
      }

      // Prepare comprehensive metadata
      const metadata = {
        title,
        description,
        category,
        price: parseFloat(price),
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploaderAddress,
        uploadTimestamp: new Date().toISOString(),
      };

      // Add CSV-specific metadata if available
      if (req.csvMetadata) {
        metadata.csvData = req.csvMetadata;
        metadata.dataPreview = {
          headers: req.csvMetadata.headers,
          sampleRows: req.csvMetadata.sampleData,
          totalRows: req.csvMetadata.totalRows,
          totalColumns: req.csvMetadata.totalColumns,
        };
      }

      // Upload file to IPFS
      const ipfsResult = await ipfsService.uploadFile(
        file.buffer,
        file.originalname,
        metadata
      );

      // Prepare data for Aptos transaction
      const datasetData = {
        ipfsHash: ipfsResult.ipfsHash,
        title,
        description,
        category,
        price: aptosService.convertAPTToOctas(parseFloat(price)), // Convert APT to octas
      };

      // Build Aptos transaction (if uploader address is provided)
      let aptosTransaction = null;
      if (uploaderAddress) {
        try {
          const transactionResult = await aptosService.uploadDataset(
            uploaderAddress,
            datasetData
          );
          aptosTransaction = transactionResult.transaction;
        } catch (aptosError) {
          console.warn(
            "⚠️ Failed to build Aptos transaction:",
            aptosError.message
          );
          // Continue without Aptos transaction - frontend can handle this
        }
      }

      res.json({
        success: true,
        message: "Dataset uploaded successfully",
        data: {
          // IPFS data
          ipfsHash: ipfsResult.ipfsHash,
          metadataHash: ipfsResult.metadataHash,
          ipfsUrl: ipfsResult.ipfsUrl,
          metadataUrl: ipfsResult.metadataUrl,

          // Dataset metadata
          title,
          description,
          category,
          price: parseFloat(price),
          fileName: ipfsResult.fileName,
          fileSize: ipfsResult.fileSize,

          // Aptos transaction data
          aptosTransaction,
          contractData: datasetData,

          // Additional metadata
          metadata: ipfsResult.metadata,
        },
      });
    } catch (error) {
      console.error("❌ Dataset upload error:", error);
      res.status(500).json({
        success: false,
        error: "Dataset upload failed",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/upload/file/:hash
 * Retrieve a file from IPFS
 */
router.get("/file/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || hash.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Invalid IPFS hash",
      });
    }

    console.log(`📥 Retrieving file from IPFS: ${hash}`);

    const fileBuffer = await ipfsService.getFile(hash);

    // Set appropriate headers
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="ipfs-${hash}"`,
      "Content-Length": fileBuffer.length,
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error("❌ File retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "File retrieval failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/upload/metadata/:hash
 * Retrieve metadata from IPFS
 */
router.get("/metadata/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || hash.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Invalid IPFS hash",
      });
    }

    console.log(`📥 Retrieving metadata from IPFS: ${hash}`);

    const metadata = await ipfsService.getMetadata(hash);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error("❌ Metadata retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Metadata retrieval failed",
      message: error.message,
    });
  }
});

/**
 * POST /api/upload/pin/:hash
 * Pin a file to IPFS to ensure availability
 */
router.post("/pin/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || hash.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Invalid IPFS hash",
      });
    }

    console.log(`📌 Pinning file to IPFS: ${hash}`);

    const pinResult = await ipfsService.pinFile(hash);

    if (pinResult) {
      res.json({
        success: true,
        message: "File pinned successfully",
        hash,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to pin file",
      });
    }
  } catch (error) {
    console.error("❌ File pinning error:", error);
    res.status(500).json({
      success: false,
      error: "File pinning failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/upload/status
 * Get IPFS service status
 */
router.get("/status", async (req, res) => {
  try {
    const isConnected = await ipfsService.isConnected();
    const nodeInfo = await ipfsService.getNodeInfo();

    res.json({
      success: true,
      ipfsConnected: isConnected,
      nodeInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ IPFS status check error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check IPFS status",
      message: error.message,
    });
  }
});

module.exports = router;
