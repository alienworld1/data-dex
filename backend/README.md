# DataDex Backend

Backend API server for DataDex - A decentralized data marketplace on the Aptos blockchain.

## Features

- 🔗 **IPFS Integration**: Upload and retrieve files from IPFS
- ⛓️ **Aptos Blockchain**: Interact with DataDex smart contracts
- 📁 **File Upload**: Handle CSV, JSON, and text file uploads
- 🔒 **Security**: Rate limiting, input validation, and secure file handling
- 📊 **Analytics**: Track marketplace statistics and user activity
- 🧩 **Modular Architecture**: Clean separation of concerns

## Project Structure

```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration
├── .env.example           # Environment template
├── config/
│   └── multer.js          # File upload configuration
├── routes/
│   ├── upload.js          # IPFS upload endpoints
│   ├── datasets.js        # Dataset management endpoints
│   └── aptos.js           # Aptos blockchain endpoints
├── services/
│   ├── ipfsService.js     # IPFS client service
│   └── aptosService.js    # Aptos blockchain service
├── middleware/
│   ├── validation.js      # Input validation middleware
│   └── logging.js         # Request logging middleware
├── utils/
│   └── helpers.js         # Utility functions
└── uploads/               # Temporary file storage
```

## API Endpoints

### Upload Routes (`/api/upload`)

- `POST /file` - Upload a file to IPFS
- `POST /dataset` - Upload a dataset with metadata
- `GET /file/:hash` - Retrieve a file from IPFS
- `GET /metadata/:hash` - Get file metadata from IPFS
- `POST /pin/:hash` - Pin a file to IPFS
- `GET /status` - Check IPFS service status

### Dataset Routes (`/api/datasets`)

- `GET /` - Get all active datasets
- `GET /:id` - Get a specific dataset by ID
- `GET /owner/:address` - Get datasets by owner address
- `GET /:id/metadata` - Get dataset metadata
- `GET /:id/content` - Get dataset content (requires purchase)
- `POST /:id/purchase` - Build a purchase transaction
- `GET /search` - Search datasets with filters

### Aptos Routes (`/api/aptos`)

- `GET /account/:address` - Get account information
- `GET /stats/:address` - Get user marketplace statistics
- `GET /purchases/:address` - Get user purchase history
- `GET /platform-stats` - Get platform statistics
- `POST /transaction/simulate` - Simulate a transaction
- `GET /transaction/:hash` - Get transaction details
- `POST /transaction/wait` - Wait for transaction confirmation
- `GET /check-purchase/:address/:datasetId` - Check purchase status
- `GET /network-info` - Get network information

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Add `.env` with your configuration:

```env
# IPFS Configuration (Infura)
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_project_secret

# Aptos Configuration
APTOS_NETWORK=testnet
MARKETPLACE_CONTRACT_ADDRESS=0x1

# Other settings
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Run the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Environment Variables

| Variable                       | Description                          | Default                                     |
| ------------------------------ | ------------------------------------ | ------------------------------------------- |
| `NODE_ENV`                     | Environment (development/production) | `development`                               |
| `PORT`                         | Server port                          | `3001`                                      |
| `FRONTEND_URL`                 | Frontend URL for CORS                | `http://localhost:5173`                     |
| `IPFS_HOST`                    | IPFS host                            | `ipfs.infura.io`                            |
| `IPFS_PORT`                    | IPFS port                            | `5001`                                      |
| `IPFS_PROTOCOL`                | IPFS protocol                        | `https`                                     |
| `IPFS_PROJECT_ID`              | Infura project ID                    | -                                           |
| `IPFS_PROJECT_SECRET`          | Infura project secret                | -                                           |
| `APTOS_NETWORK`                | Aptos network (testnet/mainnet)      | `testnet`                                   |
| `APTOS_NODE_URL`               | Aptos node URL                       | `https://fullnode.testnet.aptoslabs.com/v1` |
| `MARKETPLACE_CONTRACT_ADDRESS` | Contract address                     | `0x1`                                       |
| `MAX_FILE_SIZE`                | Max upload size in bytes             | `10485760` (10MB)                           |
| `ALLOWED_FILE_TYPES`           | Allowed MIME types                   | `text/csv,application/json,text/plain`      |

## Usage Examples

### Upload a Dataset

```bash
curl -X POST http://localhost:3001/api/upload/dataset \
  -F "dataFile=@sales_data.csv" \
  -F "title=Sales Data Q1 2024" \
  -F "description=Quarterly sales data for retail business" \
  -F "category=sales_data" \
  -F "price=0.5" \
  -F "uploaderAddress=0x123..."
```

### Get All Datasets

```bash
curl http://localhost:3001/api/datasets
```

### Get Account Information

```bash
curl http://localhost:3001/api/aptos/account/0x123...
```

### Search Datasets

```bash
curl "http://localhost:3001/api/datasets/search?category=sales_data&minPrice=0.1&maxPrice=1.0"
```

## File Upload Guidelines

### Supported File Types

- **CSV Files**: Must have header row and consistent column structure
- **JSON Files**: Valid JSON format
- **Text Files**: Plain text files

### File Size Limits

- Maximum file size: 10MB (configurable)
- Files are temporarily stored in memory during upload
- Files are permanently stored on IPFS

### CSV Validation

The backend automatically validates CSV files:

- Must contain at least 2 columns
- Must have header row + data rows
- All rows must have consistent column count
- Generates preview data with sample rows

## Security Features

### Rate Limiting

- 100 requests per 15 minutes per IP
- Configurable via environment variables

### Input Validation

- File type validation
- File size limits
- Address format validation
- Price validation
- CSV structure validation

### Error Handling

- Comprehensive error logging
- User-friendly error messages
- No sensitive information in responses

## Development

### Adding New Routes

1. Create route file in `routes/`
2. Add route to `server.js`
3. Use appropriate middleware for validation
4. Follow existing patterns for error handling

### Adding New Services

1. Create service file in `services/`
2. Export a singleton instance
3. Include proper error handling
4. Add logging for debugging

### Testing

The server includes a health check endpoint:

```bash
curl http://localhost:3001/health
```

## Troubleshooting

### IPFS Connection Issues

1. Check Infura credentials in `.env`
2. Verify network connectivity
3. Check IPFS service status: `GET /api/upload/status`

### Aptos Connection Issues

1. Verify network configuration
2. Check contract address
3. Ensure Aptos node is accessible

### File Upload Issues

1. Check file size limits
2. Verify supported file types
3. Check disk space for temporary storage

## Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Use environment-specific IPFS settings
4. Set up proper logging

### Performance Optimization

1. Enable gzip compression
2. Set up reverse proxy (nginx)
3. Configure appropriate rate limits
4. Monitor memory usage for large file uploads

### Security Considerations

1. Use HTTPS in production
2. Implement proper authentication
3. Validate all user inputs
4. Monitor for suspicious activity
