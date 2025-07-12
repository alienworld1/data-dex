const { create } = require("ipfs-http-client");

class IPFSService {
  constructor() {
    // Initialize IPFS client
    const auth =
      process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET
        ? `Basic ${Buffer.from(
            `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`
          ).toString("base64")}`
        : undefined;

    this.client = create({
      host: process.env.IPFS_HOST || "ipfs.infura.io",
      port: parseInt(process.env.IPFS_PORT) || 5001,
      protocol: process.env.IPFS_PROTOCOL || "https",
      headers: auth ? { authorization: auth } : undefined,
    });

    console.log("🔗 IPFS client initialized");
  }

  /**
   * Upload a file to IPFS
   * @param {Buffer} fileBuffer - The file buffer to upload
   * @param {string} fileName - The original file name
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - IPFS hash and metadata
   */
  async uploadFile(fileBuffer, fileName, metadata = {}) {
    try {
      console.log(`📤 Uploading file to IPFS: ${fileName}`);

      // Create file object with metadata
      const fileObject = {
        path: fileName,
        content: fileBuffer,
      };

      // Add file to IPFS
      const result = await this.client.add(fileObject, {
        progress: (bytes) => {
          console.log(`⏳ Upload progress: ${bytes} bytes`);
        },
        pin: true, // Pin the file to ensure it stays on the network
      });

      const ipfsHash = result.cid.toString();
      console.log(`✅ File uploaded to IPFS: ${ipfsHash}`);

      // Upload metadata as well
      const metadataObject = {
        fileName,
        fileSize: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
        contentHash: ipfsHash,
        ...metadata,
      };

      const metadataResult = await this.client.add(
        JSON.stringify(metadataObject, null, 2),
        { pin: true }
      );

      const metadataHash = metadataResult.cid.toString();
      console.log(`✅ Metadata uploaded to IPFS: ${metadataHash}`);

      return {
        success: true,
        ipfsHash,
        metadataHash,
        fileName,
        fileSize: fileBuffer.length,
        metadata: metadataObject,
        ipfsUrl: `https://ipfs.io/ipfs/${ipfsHash}`,
        metadataUrl: `https://ipfs.io/ipfs/${metadataHash}`,
      };
    } catch (error) {
      console.error("❌ IPFS upload error:", error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve file from IPFS
   * @param {string} ipfsHash - The IPFS hash of the file
   * @returns {Promise<Buffer>} - File content as buffer
   */
  async getFile(ipfsHash) {
    try {
      console.log(`📥 Retrieving file from IPFS: ${ipfsHash}`);

      const chunks = [];
      for await (const chunk of this.client.cat(ipfsHash)) {
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);
      console.log(`✅ File retrieved from IPFS: ${fileBuffer.length} bytes`);

      return fileBuffer;
    } catch (error) {
      console.error("❌ IPFS retrieval error:", error);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  /**
   * Get file metadata from IPFS
   * @param {string} metadataHash - The IPFS hash of the metadata
   * @returns {Promise<Object>} - Parsed metadata
   */
  async getMetadata(metadataHash) {
    try {
      console.log(`📥 Retrieving metadata from IPFS: ${metadataHash}`);

      const metadataBuffer = await this.getFile(metadataHash);
      const metadata = JSON.parse(metadataBuffer.toString());

      console.log(`✅ Metadata retrieved from IPFS`);
      return metadata;
    } catch (error) {
      console.error("❌ IPFS metadata retrieval error:", error);
      throw new Error(
        `Failed to retrieve metadata from IPFS: ${error.message}`
      );
    }
  }

  /**
   * Pin an existing file to ensure it stays available
   * @param {string} ipfsHash - The IPFS hash to pin
   * @returns {Promise<boolean>} - Success status
   */
  async pinFile(ipfsHash) {
    try {
      console.log(`📌 Pinning file to IPFS: ${ipfsHash}`);
      await this.client.pin.add(ipfsHash);
      console.log(`✅ File pinned successfully`);
      return true;
    } catch (error) {
      console.error("❌ IPFS pinning error:", error);
      return false;
    }
  }

  /**
   * Check if IPFS client is connected
   * @returns {Promise<boolean>} - Connection status
   */
  async isConnected() {
    try {
      await this.client.version();
      return true;
    } catch (error) {
      console.error("❌ IPFS connection error:", error);
      return false;
    }
  }

  /**
   * Get IPFS node information
   * @returns {Promise<Object>} - Node information
   */
  async getNodeInfo() {
    try {
      const version = await this.client.version();
      const id = await this.client.id();
      return {
        version: version.version,
        nodeId: id.id,
        agentVersion: id.agentVersion,
        protocolVersion: id.protocolVersion,
      };
    } catch (error) {
      console.error("❌ Failed to get IPFS node info:", error);
      return null;
    }
  }
}

module.exports = new IPFSService();
