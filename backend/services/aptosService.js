const {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
} = require("@aptos-labs/ts-sdk");

class AptosService {
  constructor() {
    // Initialize Aptos client
    const network =
      process.env.APTOS_NETWORK === "mainnet"
        ? Network.MAINNET
        : Network.TESTNET;
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);

    this.contractAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS || "0x1";
    this.moduleAddress = `${this.contractAddress}::Marketplace`;

    console.log(`🔗 Aptos client initialized for ${network}`);
    console.log(`📋 Contract address: ${this.contractAddress}`);
  }

  /**
   * Get account information
   * @param {string} accountAddress - The account address
   * @returns {Promise<Object>} - Account information
   */
  async getAccountInfo(accountAddress) {
    try {
      const account = await this.aptos.getAccountInfo({ accountAddress });
      const balance = await this.aptos.getAccountAPTAmount({ accountAddress });

      return {
        address: account.address,
        sequenceNumber: account.sequence_number,
        authenticationKey: account.authentication_key,
        balance: balance,
      };
    } catch (error) {
      console.error("❌ Failed to get account info:", error);
      throw new Error(`Failed to get account information: ${error.message}`);
    }
  }

  /**
   * Upload dataset metadata to the marketplace contract
   * @param {string} senderAddress - The sender's address
   * @param {Object} datasetData - Dataset information
   * @returns {Promise<Object>} - Transaction result
   */
  async uploadDataset(senderAddress, datasetData) {
    try {
      const { ipfsHash, title, description, category, price } = datasetData;

      console.log(`📤 Uploading dataset to Aptos marketplace: ${title}`);

      const transaction = await this.aptos.transaction.build.simple({
        sender: senderAddress,
        data: {
          function: `${this.moduleAddress}::upload_dataset`,
          functionArguments: [
            ipfsHash,
            title,
            description,
            category,
            price.toString(),
          ],
        },
      });

      return {
        success: true,
        transaction,
        message: "Dataset upload transaction built successfully",
      };
    } catch (error) {
      console.error("❌ Failed to upload dataset to Aptos:", error);
      throw new Error(`Failed to upload dataset: ${error.message}`);
    }
  }

  /**
   * Purchase a dataset from the marketplace
   * @param {string} buyerAddress - The buyer's address
   * @param {number} datasetId - The dataset ID to purchase
   * @returns {Promise<Object>} - Transaction result
   */
  async purchaseDataset(buyerAddress, datasetId) {
    try {
      console.log(`🛒 Building purchase transaction for dataset ${datasetId}`);

      const transaction = await this.aptos.transaction.build.simple({
        sender: buyerAddress,
        data: {
          function: `${this.moduleAddress}::purchase_dataset`,
          functionArguments: [datasetId.toString()],
        },
      });

      return {
        success: true,
        transaction,
        message: "Purchase transaction built successfully",
      };
    } catch (error) {
      console.error("❌ Failed to build purchase transaction:", error);
      throw new Error(`Failed to purchase dataset: ${error.message}`);
    }
  }

  /**
   * Get all active datasets from the marketplace
   * @returns {Promise<Array>} - List of active datasets
   */
  async getActiveDatasets() {
    try {
      console.log("📋 Fetching active datasets from marketplace");

      const datasets = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::get_active_datasets`,
          functionArguments: [],
        },
      });

      return datasets[0] || [];
    } catch (error) {
      console.error("❌ Failed to get active datasets:", error);
      throw new Error(`Failed to get datasets: ${error.message}`);
    }
  }

  /**
   * Get datasets owned by a specific address
   * @param {string} ownerAddress - The owner's address
   * @returns {Promise<Array>} - List of datasets owned by the address
   */
  async getDatasetsByOwner(ownerAddress) {
    try {
      console.log(`📋 Fetching datasets for owner: ${ownerAddress}`);

      const datasets = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::get_datasets_by_owner`,
          functionArguments: [ownerAddress],
        },
      });

      return datasets[0] || [];
    } catch (error) {
      console.error("❌ Failed to get datasets by owner:", error);
      throw new Error(`Failed to get datasets: ${error.message}`);
    }
  }

  /**
   * Get a specific dataset by ID
   * @param {number} datasetId - The dataset ID
   * @returns {Promise<Object|null>} - Dataset information or null
   */
  async getDatasetById(datasetId) {
    try {
      console.log(`📋 Fetching dataset ${datasetId}`);

      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::get_dataset_by_id`,
          functionArguments: [datasetId.toString()],
        },
      });

      return result[0] || null;
    } catch (error) {
      console.error("❌ Failed to get dataset by ID:", error);
      throw new Error(`Failed to get dataset: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   * @param {string} userAddress - The user's address
   * @returns {Promise<Object|null>} - User statistics or null
   */
  async getUserStats(userAddress) {
    try {
      console.log(`📊 Fetching user stats for: ${userAddress}`);

      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::get_user_stats`,
          functionArguments: [userAddress],
        },
      });

      return result[0] || null;
    } catch (error) {
      console.error("❌ Failed to get user stats:", error);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  /**
   * Get purchases made by a user
   * @param {string} buyerAddress - The buyer's address
   * @returns {Promise<Array>} - List of purchases
   */
  async getPurchasesByBuyer(buyerAddress) {
    try {
      console.log(`🛒 Fetching purchases for buyer: ${buyerAddress}`);

      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::get_purchases_by_buyer`,
          functionArguments: [buyerAddress],
        },
      });

      return result[0] || [];
    } catch (error) {
      console.error("❌ Failed to get purchases by buyer:", error);
      throw new Error(`Failed to get purchases: ${error.message}`);
    }
  }

  /**
   * Check if a user has purchased a specific dataset
   * @param {string} buyerAddress - The buyer's address
   * @param {number} datasetId - The dataset ID
   * @returns {Promise<boolean>} - Whether the user has purchased the dataset
   */
  async hasUserPurchasedDataset(buyerAddress, datasetId) {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::has_user_purchased_dataset`,
          functionArguments: [buyerAddress, datasetId.toString()],
        },
      });

      return result[0] || false;
    } catch (error) {
      console.error("❌ Failed to check purchase status:", error);
      return false;
    }
  }

  /**
   * Get platform statistics
   * @returns {Promise<Object>} - Platform statistics
   */
  async getPlatformStats() {
    try {
      console.log("📊 Fetching platform statistics");

      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::get_platform_stats`,
          functionArguments: [],
        },
      });

      const [totalDatasets, totalPurchases, activeDatasets] = result;

      return {
        totalDatasets: parseInt(totalDatasets),
        totalPurchases: parseInt(totalPurchases),
        activeDatasets: parseInt(activeDatasets),
      };
    } catch (error) {
      console.error("❌ Failed to get platform stats:", error);
      throw new Error(`Failed to get platform stats: ${error.message}`);
    }
  }

  /**
   * Simulate a transaction to estimate gas costs
   * @param {Object} transaction - The transaction to simulate
   * @returns {Promise<Object>} - Simulation result
   */
  async simulateTransaction(transaction) {
    try {
      const simulation = await this.aptos.transaction.simulate.simple({
        signerPublicKey: transaction.senderPublicKey,
        transaction,
      });

      return {
        success: simulation.success,
        gasUsed: simulation.gas_used,
        gasUnitPrice: simulation.gas_unit_price,
        vmStatus: simulation.vm_status,
      };
    } catch (error) {
      console.error("❌ Failed to simulate transaction:", error);
      throw new Error(`Failed to simulate transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction by hash
   * @param {string} transactionHash - The transaction hash
   * @returns {Promise<Object>} - Transaction details
   */
  async getTransactionByHash(transactionHash) {
    try {
      const transaction = await this.aptos.getTransactionByHash({
        transactionHash,
      });

      return transaction;
    } catch (error) {
      console.error("❌ Failed to get transaction:", error);
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  /**
   * Wait for a transaction to be confirmed
   * @param {string} transactionHash - The transaction hash
   * @returns {Promise<Object>} - Transaction confirmation
   */
  async waitForTransaction(transactionHash) {
    try {
      console.log(
        `⏳ Waiting for transaction confirmation: ${transactionHash}`
      );

      const transaction = await this.aptos.waitForTransaction({
        transactionHash,
      });

      console.log(`✅ Transaction confirmed: ${transactionHash}`);
      return transaction;
    } catch (error) {
      console.error("❌ Transaction failed or timed out:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Format APT amount from octas
   * @param {string|number} octas - Amount in octas
   * @returns {number} - Amount in APT
   */
  formatAPTAmount(octas) {
    return parseInt(octas) / 100000000; // 1 APT = 100,000,000 octas
  }

  /**
   * Convert APT to octas
   * @param {number} apt - Amount in APT
   * @returns {string} - Amount in octas as string
   */
  convertAPTToOctas(apt) {
    return (apt * 100000000).toString();
  }
}

module.exports = new AptosService();
