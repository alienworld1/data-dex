const express = require("express");
const router = express.Router();

const aptosService = require("../services/aptosService");
const { validateAptosAddress } = require("../middleware/validation");

/**
 * GET /api/aptos/account/:address
 * Get account information for a specific address
 */
router.get("/account/:address", validateAptosAddress, async (req, res) => {
  try {
    const address = req.params.address;
    console.log(`📊 Fetching account info for: ${address}`);

    const accountInfo = await aptosService.getAccountInfo(address);

    res.json({
      success: true,
      data: {
        ...accountInfo,
        balanceInAPT: aptosService.formatAPTAmount(accountInfo.balance),
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch account info:", error);

    // Handle case where account doesn't exist
    if (error.message.includes("Account not found")) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
        message: "The specified account does not exist on the Aptos blockchain",
        address: req.params.address,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch account information",
      message: error.message,
    });
  }
});

/**
 * GET /api/aptos/stats/:address
 * Get user statistics from the marketplace
 */
router.get("/stats/:address", validateAptosAddress, async (req, res) => {
  try {
    const address = req.params.address;
    console.log(`📊 Fetching user stats for: ${address}`);

    const userStats = await aptosService.getUserStats(address);

    if (!userStats) {
      return res.json({
        success: true,
        data: {
          address,
          datasetsUploaded: 0,
          datasetsPurchased: 0,
          totalEarned: 0,
          totalSpent: 0,
          totalEarnedInAPT: 0,
          totalSpentInAPT: 0,
          hasActivity: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        address,
        datasetsUploaded: parseInt(userStats.datasets_uploaded),
        datasetsPurchased: parseInt(userStats.datasets_purchased),
        totalEarned: parseInt(userStats.total_earned),
        totalSpent: parseInt(userStats.total_spent),
        totalEarnedInAPT: aptosService.formatAPTAmount(userStats.total_earned),
        totalSpentInAPT: aptosService.formatAPTAmount(userStats.total_spent),
        hasActivity: true,
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch user stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user statistics",
      message: error.message,
    });
  }
});

/**
 * GET /api/aptos/purchases/:address
 * Get purchases made by a specific address
 */
router.get("/purchases/:address", validateAptosAddress, async (req, res) => {
  try {
    const address = req.params.address;
    console.log(`🛒 Fetching purchases for: ${address}`);

    const purchases = await aptosService.getPurchasesByBuyer(address);

    // Enhance purchases with additional computed fields
    const enhancedPurchases = purchases.map((purchase) => ({
      ...purchase,
      priceInAPT: aptosService.formatAPTAmount(purchase.price),
      purchasedAtFormatted: new Date(
        parseInt(purchase.purchased_at) * 1000
      ).toISOString(),
    }));

    res.json({
      success: true,
      buyer: address,
      count: enhancedPurchases.length,
      data: enhancedPurchases,
    });
  } catch (error) {
    console.error("❌ Failed to fetch purchases:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch purchases",
      message: error.message,
    });
  }
});

/**
 * GET /api/aptos/platform-stats
 * Get overall platform statistics
 */
router.get("/platform-stats", async (req, res) => {
  try {
    console.log("📊 Fetching platform statistics");

    const stats = await aptosService.getPlatformStats();

    res.json({
      success: true,
      data: {
        totalDatasets: stats.totalDatasets,
        totalPurchases: stats.totalPurchases,
        activeDatasets: stats.activeDatasets,
        inactiveDatasets: stats.totalDatasets - stats.activeDatasets,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch platform stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch platform statistics",
      message: error.message,
    });
  }
});

/**
 * POST /api/aptos/transaction/simulate
 * Simulate a transaction to estimate gas costs
 */
router.post("/transaction/simulate", async (req, res) => {
  try {
    const { transaction, senderPublicKey } = req.body;

    if (!transaction || !senderPublicKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Transaction and senderPublicKey are required",
      });
    }

    console.log("🧪 Simulating transaction");

    // Add the sender public key to the transaction
    const transactionWithKey = {
      ...transaction,
      senderPublicKey,
    };

    const simulation = await aptosService.simulateTransaction(
      transactionWithKey
    );

    res.json({
      success: true,
      data: {
        ...simulation,
        estimatedGasCost:
          parseInt(simulation.gasUsed) * parseInt(simulation.gasUnitPrice),
        estimatedGasCostInAPT: aptosService.formatAPTAmount(
          parseInt(simulation.gasUsed) * parseInt(simulation.gasUnitPrice)
        ),
      },
    });
  } catch (error) {
    console.error("❌ Failed to simulate transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to simulate transaction",
      message: error.message,
    });
  }
});

/**
 * GET /api/aptos/transaction/:hash
 * Get transaction details by hash
 */
router.get("/transaction/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || hash.length !== 66 || !hash.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        error: "Invalid transaction hash format",
      });
    }

    console.log(`📄 Fetching transaction: ${hash}`);

    const transaction = await aptosService.getTransactionByHash(hash);

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("❌ Failed to fetch transaction:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
        message: "The specified transaction hash does not exist",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction",
      message: error.message,
    });
  }
});

/**
 * POST /api/aptos/transaction/wait
 * Wait for a transaction to be confirmed
 */
router.post("/transaction/wait", async (req, res) => {
  try {
    const { transactionHash } = req.body;

    if (!transactionHash) {
      return res.status(400).json({
        success: false,
        error: "Transaction hash is required",
      });
    }

    console.log(`⏳ Waiting for transaction: ${transactionHash}`);

    const transaction = await aptosService.waitForTransaction(transactionHash);

    res.json({
      success: true,
      message: "Transaction confirmed",
      data: transaction,
    });
  } catch (error) {
    console.error("❌ Transaction wait failed:", error);
    res.status(500).json({
      success: false,
      error: "Transaction failed or timed out",
      message: error.message,
    });
  }
});

/**
 * GET /api/aptos/check-purchase/:address/:datasetId
 * Check if a user has purchased a specific dataset
 */
router.get(
  "/check-purchase/:address/:datasetId",
  validateAptosAddress,
  async (req, res) => {
    try {
      const { address, datasetId } = req.params;
      const parsedDatasetId = parseInt(datasetId);

      if (isNaN(parsedDatasetId) || parsedDatasetId <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid dataset ID",
        });
      }

      console.log(
        `🔍 Checking purchase status: ${address} -> dataset ${parsedDatasetId}`
      );

      const hasPurchased = await aptosService.hasUserPurchasedDataset(
        address,
        parsedDatasetId
      );

      res.json({
        success: true,
        data: {
          buyer: address,
          datasetId: parsedDatasetId,
          hasPurchased,
        },
      });
    } catch (error) {
      console.error("❌ Failed to check purchase status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check purchase status",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/aptos/network-info
 * Get Aptos network information
 */
router.get("/network-info", async (req, res) => {
  try {
    console.log("🌐 Fetching network information");

    const networkInfo = {
      network: process.env.APTOS_NETWORK || "testnet",
      nodeUrl:
        process.env.APTOS_NODE_URL ||
        "https://fullnode.testnet.aptoslabs.com/v1",
      faucetUrl:
        process.env.APTOS_FAUCET_URL || "https://faucet.testnet.aptoslabs.com",
      contractAddress: process.env.MARKETPLACE_CONTRACT_ADDRESS || "0x1",
      chainId: process.env.APTOS_NETWORK === "mainnet" ? 1 : 2,
    };

    res.json({
      success: true,
      data: networkInfo,
    });
  } catch (error) {
    console.error("❌ Failed to get network info:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get network information",
      message: error.message,
    });
  }
});

/**
 * POST /api/aptos/utils/convert-price
 * Utility endpoint to convert between APT and octas
 */
router.post("/utils/convert-price", async (req, res) => {
  try {
    const { amount, from } = req.body;

    if (!amount || !from) {
      return res.status(400).json({
        success: false,
        error: "Amount and from currency are required",
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    let result;
    if (from.toLowerCase() === "apt") {
      result = {
        apt: numAmount,
        octas: aptosService.convertAPTToOctas(numAmount),
      };
    } else if (from.toLowerCase() === "octas") {
      result = {
        apt: aptosService.formatAPTAmount(amount),
        octas: amount.toString(),
      };
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid currency",
        message: 'Currency must be either "apt" or "octas"',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Failed to convert price:", error);
    res.status(500).json({
      success: false,
      error: "Failed to convert price",
      message: error.message,
    });
  }
});

module.exports = router;
