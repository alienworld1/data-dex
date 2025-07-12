const express = require("express");
const router = express.Router();

const aptosService = require("../services/aptosService");
const ipfsService = require("../services/ipfsService");
const {
  validateAptosAddress,
  validateDatasetId,
  validate,
  schemas,
} = require("../middleware/validation");

/**
 * GET /api/datasets
 * Get all active datasets from the marketplace
 */
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching all active datasets");

    const datasets = await aptosService.getActiveDatasets();

    // Enhance datasets with additional computed fields
    const enhancedDatasets = datasets.map((dataset) => ({
      ...dataset,
      priceInAPT: aptosService.formatAPTAmount(dataset.price),
      createdAtFormatted: new Date(
        parseInt(dataset.created_at) * 1000
      ).toISOString(),
      ipfsUrl: `https://ipfs.io/ipfs/${dataset.ipfs_hash}`,
    }));

    res.json({
      success: true,
      count: enhancedDatasets.length,
      data: enhancedDatasets,
    });
  } catch (error) {
    console.error("❌ Failed to fetch datasets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch datasets",
      message: error.message,
    });
  }
});

/**
 * GET /api/datasets/:id
 * Get a specific dataset by ID
 */
router.get("/:id", validateDatasetId, async (req, res) => {
  try {
    const datasetId = req.datasetId;
    console.log(`📋 Fetching dataset ${datasetId}`);

    const dataset = await aptosService.getDatasetById(datasetId);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset not found",
        message: `Dataset with ID ${datasetId} does not exist`,
      });
    }

    // Enhance dataset with additional computed fields
    const enhancedDataset = {
      ...dataset,
      priceInAPT: aptosService.formatAPTAmount(dataset.price),
      createdAtFormatted: new Date(
        parseInt(dataset.created_at) * 1000
      ).toISOString(),
      ipfsUrl: `https://ipfs.io/ipfs/${dataset.ipfs_hash}`,
    };

    res.json({
      success: true,
      data: enhancedDataset,
    });
  } catch (error) {
    console.error("❌ Failed to fetch dataset:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dataset",
      message: error.message,
    });
  }
});

/**
 * GET /api/datasets/owner/:address
 * Get datasets owned by a specific address
 */
router.get("/owner/:address", validateAptosAddress, async (req, res) => {
  try {
    const ownerAddress = req.params.address;
    console.log(`📋 Fetching datasets for owner: ${ownerAddress}`);

    const datasets = await aptosService.getDatasetsByOwner(ownerAddress);

    // Enhance datasets with additional computed fields
    const enhancedDatasets = datasets.map((dataset) => ({
      ...dataset,
      priceInAPT: aptosService.formatAPTAmount(dataset.price),
      createdAtFormatted: new Date(
        parseInt(dataset.created_at) * 1000
      ).toISOString(),
      ipfsUrl: `https://ipfs.io/ipfs/${dataset.ipfs_hash}`,
    }));

    res.json({
      success: true,
      owner: ownerAddress,
      count: enhancedDatasets.length,
      data: enhancedDatasets,
    });
  } catch (error) {
    console.error("❌ Failed to fetch datasets by owner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch datasets",
      message: error.message,
    });
  }
});

/**
 * GET /api/datasets/:id/metadata
 * Get dataset metadata from IPFS
 */
router.get("/:id/metadata", validateDatasetId, async (req, res) => {
  try {
    const datasetId = req.datasetId;
    console.log(`📋 Fetching metadata for dataset ${datasetId}`);

    // First get the dataset to obtain the IPFS hash
    const dataset = await aptosService.getDatasetById(datasetId);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset not found",
      });
    }

    // Try to fetch metadata from IPFS if available
    let ipfsMetadata = null;
    try {
      // Assuming the metadata hash might be stored or can be derived
      // For now, we'll return the on-chain metadata
      ipfsMetadata = {
        ipfsHash: dataset.ipfs_hash,
        title: dataset.title,
        description: dataset.description,
        category: dataset.category,
        owner: dataset.owner,
        created_at: dataset.created_at,
        ipfsUrl: `https://ipfs.io/ipfs/${dataset.ipfs_hash}`,
      };
    } catch (ipfsError) {
      console.warn("⚠️ Could not fetch IPFS metadata:", ipfsError.message);
    }

    res.json({
      success: true,
      datasetId,
      metadata: ipfsMetadata || {
        ipfsHash: dataset.ipfs_hash,
        title: dataset.title,
        description: dataset.description,
        category: dataset.category,
        message: "Extended metadata not available",
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch dataset metadata:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dataset metadata",
      message: error.message,
    });
  }
});

/**
 * GET /api/datasets/:id/content
 * Get dataset content from IPFS
 */
router.get("/:id/content", validateDatasetId, async (req, res) => {
  try {
    const datasetId = req.datasetId;
    console.log(`📥 Fetching content for dataset ${datasetId}`);

    // First get the dataset to obtain the IPFS hash
    const dataset = await aptosService.getDatasetById(datasetId);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset not found",
      });
    }

    // Check if user has purchased this dataset (optional check)
    const buyerAddress = req.query.buyer;
    if (buyerAddress) {
      const hasPurchased = await aptosService.hasUserPurchasedDataset(
        buyerAddress,
        datasetId
      );
      if (!hasPurchased) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You must purchase this dataset to access its content",
        });
      }
    }

    // Fetch file content from IPFS
    const fileBuffer = await ipfsService.getFile(dataset.ipfs_hash);

    // Set appropriate headers
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${dataset.title.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.csv"`,
      "Content-Length": fileBuffer.length,
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error("❌ Failed to fetch dataset content:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dataset content",
      message: error.message,
    });
  }
});

/**
 * POST /api/datasets/:id/purchase
 * Build a purchase transaction for a dataset
 */
router.post(
  "/:id/purchase",
  validateDatasetId,
  validate(schemas.purchaseDataset),
  async (req, res) => {
    try {
      const datasetId = req.datasetId;
      const { buyerAddress } = req.body;

      console.log(`🛒 Building purchase transaction for dataset ${datasetId}`);

      // Check if dataset exists
      const dataset = await aptosService.getDatasetById(datasetId);
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: "Dataset not found",
        });
      }

      // Check if dataset is active
      if (!dataset.is_active) {
        return res.status(400).json({
          success: false,
          error: "Dataset is not available for purchase",
        });
      }

      // Check if user has already purchased this dataset
      const alreadyPurchased = await aptosService.hasUserPurchasedDataset(
        buyerAddress,
        datasetId
      );
      if (alreadyPurchased) {
        return res.status(400).json({
          success: false,
          error: "Dataset already purchased",
          message: "You have already purchased this dataset",
        });
      }

      // Build purchase transaction
      const transactionResult = await aptosService.purchaseDataset(
        buyerAddress,
        datasetId
      );

      res.json({
        success: true,
        message: "Purchase transaction built successfully",
        data: {
          transaction: transactionResult.transaction,
          dataset: {
            id: dataset.id,
            title: dataset.title,
            price: dataset.price,
            priceInAPT: aptosService.formatAPTAmount(dataset.price),
            owner: dataset.owner,
          },
          buyer: buyerAddress,
        },
      });
    } catch (error) {
      console.error("❌ Failed to build purchase transaction:", error);
      res.status(500).json({
        success: false,
        error: "Failed to build purchase transaction",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/datasets/:id/purchasers
 * Get list of users who purchased a specific dataset (owner only)
 */
router.get("/:id/purchasers", validateDatasetId, async (req, res) => {
  try {
    const datasetId = req.datasetId;
    const ownerAddress = req.query.owner;

    console.log(`📊 Fetching purchasers for dataset ${datasetId}`);

    // Verify ownership if owner address is provided
    if (ownerAddress) {
      const dataset = await aptosService.getDatasetById(datasetId);
      if (!dataset || dataset.owner !== ownerAddress) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Only the dataset owner can view purchaser information",
        });
      }
    }

    // Note: This would require additional functionality in the smart contract
    // For now, return a placeholder response
    res.json({
      success: true,
      datasetId,
      message:
        "Purchaser information requires additional smart contract functionality",
      data: [], // Placeholder
    });
  } catch (error) {
    console.error("❌ Failed to fetch purchasers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch purchasers",
      message: error.message,
    });
  }
});

/**
 * GET /api/datasets/search
 * Search datasets by category, title, or description
 */
router.get("/search", async (req, res) => {
  try {
    const { category, title, description, minPrice, maxPrice } = req.query;

    console.log("🔍 Searching datasets with filters:", {
      category,
      title,
      description,
      minPrice,
      maxPrice,
    });

    // Get all active datasets
    const allDatasets = await aptosService.getActiveDatasets();

    // Apply filters
    let filteredDatasets = allDatasets;

    if (category) {
      filteredDatasets = filteredDatasets.filter((dataset) =>
        dataset.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (title) {
      filteredDatasets = filteredDatasets.filter((dataset) =>
        dataset.title.toLowerCase().includes(title.toLowerCase())
      );
    }

    if (description) {
      filteredDatasets = filteredDatasets.filter((dataset) =>
        dataset.description.toLowerCase().includes(description.toLowerCase())
      );
    }

    if (minPrice) {
      const minPriceOctas = aptosService.convertAPTToOctas(
        parseFloat(minPrice)
      );
      filteredDatasets = filteredDatasets.filter(
        (dataset) => parseInt(dataset.price) >= parseInt(minPriceOctas)
      );
    }

    if (maxPrice) {
      const maxPriceOctas = aptosService.convertAPTToOctas(
        parseFloat(maxPrice)
      );
      filteredDatasets = filteredDatasets.filter(
        (dataset) => parseInt(dataset.price) <= parseInt(maxPriceOctas)
      );
    }

    // Enhance datasets with additional computed fields
    const enhancedDatasets = filteredDatasets.map((dataset) => ({
      ...dataset,
      priceInAPT: aptosService.formatAPTAmount(dataset.price),
      createdAtFormatted: new Date(
        parseInt(dataset.created_at) * 1000
      ).toISOString(),
      ipfsUrl: `https://ipfs.io/ipfs/${dataset.ipfs_hash}`,
    }));

    res.json({
      success: true,
      filters: { category, title, description, minPrice, maxPrice },
      count: enhancedDatasets.length,
      data: enhancedDatasets,
    });
  } catch (error) {
    console.error("❌ Failed to search datasets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search datasets",
      message: error.message,
    });
  }
});

module.exports = router;
