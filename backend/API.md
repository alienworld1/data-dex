# DataDex Backend API Documentation

## Content Types

- All POST requests should use `multipart/form-data` for file uploads
- All other requests accept `application/json`
- All responses return `application/json`

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error message"
}
```

## Endpoints

### Health Check

#### GET /health

Check if the server is running.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-07-12T10:30:00.000Z",
  "service": "DataDex Backend"
}
```

### File Upload

#### POST /api/upload/file

Upload a file to IPFS.

**Request:**

- `dataFile`: File (multipart/form-data)
- `uploaderAddress`: String (optional) - Uploader's Aptos address

**Response:**

```json
{
  "success": true,
  "message": "File uploaded to IPFS successfully",
  "data": {
    "ipfsHash": "QmXXX...",
    "metadataHash": "QmYYY...",
    "fileName": "data.csv",
    "fileSize": 1024,
    "ipfsUrl": "https://ipfs.io/ipfs/QmXXX...",
    "metadataUrl": "https://ipfs.io/ipfs/QmYYY..."
  }
}
```

#### POST /api/upload/dataset

Upload a dataset with metadata to IPFS and build Aptos transaction.

**Request:**

- `dataFile`: File (multipart/form-data)
- `title`: String - Dataset title
- `description`: String - Dataset description
- `category`: String - Dataset category
- `price`: Number - Price in APT
- `uploaderAddress`: String (optional) - Uploader's Aptos address

**Response:**

```json
{
  "success": true,
  "message": "Dataset uploaded successfully",
  "data": {
    "ipfsHash": "QmXXX...",
    "metadataHash": "QmYYY...",
    "title": "Sales Data Q1 2024",
    "price": 0.5,
    "aptosTransaction": {...},
    "contractData": {...}
  }
}
```

### Dataset Management

#### GET /api/datasets

Get all active datasets.

**Query Parameters:**

- None

**Response:**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "title": "Sales Data Q1 2024",
      "description": "Quarterly sales data",
      "category": "sales_data",
      "price": "50000000",
      "priceInAPT": 0.5,
      "owner": "0x123...",
      "ipfs_hash": "QmXXX...",
      "is_active": true,
      "total_purchases": 3
    }
  ]
}
```

#### GET /api/datasets/:id

Get a specific dataset by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Sales Data Q1 2024",
    "priceInAPT": 0.5,
    "ipfsUrl": "https://ipfs.io/ipfs/QmXXX..."
  }
}
```

#### GET /api/datasets/owner/:address

Get datasets owned by a specific address.

**Parameters:**

- `address`: String - Owner's Aptos address (must be valid format: 0x...)

#### POST /api/datasets/:id/purchase

Build a purchase transaction for a dataset.

**Request Body:**

```json
{
  "buyerAddress": "0x456..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Purchase transaction built successfully",
  "data": {
    "transaction": {...},
    "dataset": {
      "id": 1,
      "title": "Sales Data Q1 2024",
      "priceInAPT": 0.5
    },
    "buyer": "0x456..."
  }
}
```

### Aptos Blockchain

#### GET /api/aptos/account/:address

Get account information.

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x123...",
    "balance": 100000000,
    "balanceInAPT": 1.0,
    "sequenceNumber": "5"
  }
}
```

#### GET /api/aptos/stats/:address

Get user marketplace statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x123...",
    "datasetsUploaded": 3,
    "datasetsPurchased": 5,
    "totalEarnedInAPT": 2.5,
    "totalSpentInAPT": 1.2
  }
}
```

#### GET /api/aptos/platform-stats

Get platform statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalDatasets": 50,
    "totalPurchases": 120,
    "activeDatasets": 45,
    "inactiveDatasets": 5
  }
}
```

## File Upload Guidelines

### Supported File Types

- CSV: `text/csv`
- JSON: `application/json`
- Text: `text/plain`

### File Size Limits

- Maximum: 10MB
- Configurable via `MAX_FILE_SIZE` environment variable

### CSV Validation

- Must have header row
- Must have at least 2 columns
- All rows must have consistent column count
- Generates preview with sample data

## Rate Limiting

- 100 requests per 15 minutes per IP
- Configurable via environment variables

## Example Usage

### Upload a CSV Dataset

```bash
curl -X POST http://localhost:3001/api/upload/dataset \
  -F "dataFile=@sales_data.csv" \
  -F "title=Q1 2024 Sales Data" \
  -F "description=Quarterly sales performance data" \
  -F "category=sales_data" \
  -F "price=0.5" \
  -F "uploaderAddress=0x123..."
```

### Get All Datasets

```bash
curl http://localhost:3001/api/datasets
```

### Search Datasets

```bash
curl "http://localhost:3001/api/datasets/search?category=sales_data&minPrice=0.1"
```

### Check Account Balance

```bash
curl http://localhost:3001/api/aptos/account/0x123...
```

## Error Codes

| HTTP Status | Description                        |
| ----------- | ---------------------------------- |
| 200         | Success                            |
| 400         | Bad Request - Invalid input        |
| 404         | Not Found - Resource doesn't exist |
| 500         | Internal Server Error              |

## Development Tips

1. **Testing**: Use the `/health` endpoint to verify server status
2. **IPFS**: Check `/api/upload/status` for IPFS connectivity
3. **Debugging**: Enable detailed logging in development mode
4. **File Validation**: The API validates file types and structure automatically
