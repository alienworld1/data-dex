# DataDex Smart Contracts

This directory contains the Move smart contracts for the DataDex decentralized data marketplace on the Aptos blockchain.

## 📋 Contract Overview

### 1. Marketplace Contract (`sources/Marketplace.move`)

The main marketplace contract that handles:

- **Dataset Upload**: SMEs can upload dataset metadata (IPFS hash, title, description, price)
- **Dataset Purchase**: Buyers can purchase datasets with APT tokens
- **Payment Processing**: Automatic payment distribution with platform fees
- **Access Control**: Ensures only dataset owners can modify their data
- **Event Tracking**: Comprehensive event logging for all marketplace activities

### 2. Reward System Contract (`sources/RewardSystem.move`)

An additional reward system that provides:

- **Milestone Rewards**: Achievement-based rewards for user engagement
- **Bonus Rewards**: Admin-controlled special incentives
- **Reward Pool Management**: Funding and distribution of rewards
- **User Achievement Tracking**: Progress monitoring for milestones

## 🏗️ Contract Structure

### Key Features

#### Dataset Management

- Store dataset metadata on-chain
- IPFS integration for actual data storage
- Flexible pricing and categorization
- Owner controls (activate/deactivate, price updates)

#### Marketplace Operations

- Secure purchase transactions
- Platform fee collection (configurable percentage)
- Purchase history tracking
- Duplicate purchase prevention

#### Reward System

- Automatic milestone detection
- Configurable achievement rewards
- Bonus reward system for special recognition
- Transparent reward distribution

#### User Statistics

- Track datasets uploaded and purchased
- Monitor earnings and spending
- Achievement progress tracking

## 🚀 Deployment Instructions

### Prerequisites

1. Install [Aptos CLI](https://aptos.dev/tools/aptos-cli/)
2. Set up Aptos testnet account with sufficient APT balance
3. Ensure you have access to Aptos testnet faucet

### Quick Deployment

```bash
# Navigate to contracts directory
cd contracts

# Run the deployment script
./scripts/deploy.sh
```

### Custom Deployment Options

```bash
# Deploy with custom platform fee (3%)
./scripts/deploy.sh --platform-fee 3

# Deploy with larger initial reward pool (2 APT)
./scripts/deploy.sh --reward-pool 200000000

# Skip tests during deployment
./scripts/deploy.sh --skip-tests

# Skip automatic initialization
./scripts/deploy.sh --skip-init

# Use specific profile
./scripts/deploy.sh --profile my-profile
```

### Manual Deployment

1. **Compile contracts**:

   ```bash
   aptos move compile --dev
   ```

2. **Run tests**:

   ```bash
   aptos move test --dev
   ```

3. **Publish to testnet**:

   ```bash
   aptos move publish --profile default
   ```

4. **Initialize marketplace**:

   ```bash
   aptos move run \
     --function-id YOUR_ADDRESS::Marketplace::initialize \
     --args u64:5 address:YOUR_ADDRESS
   ```

5. **Initialize reward system**:
   ```bash
   aptos move run \
     --function-id YOUR_ADDRESS::RewardSystem::initialize_reward_system \
     --args u64:100000000
   ```

## 📖 Usage Examples

### Upload a Dataset

```bash
aptos move run \
  --function-id YOUR_ADDRESS::Marketplace::upload_dataset \
  --args \
    string:"QmYourIPFSHash123" \
    string:"Sales Data Q1 2024" \
    string:"Quarterly sales data for retail business" \
    string:"Business Analytics" \
    u64:50000000
```

### Purchase a Dataset

```bash
aptos move run \
  --function-id YOUR_ADDRESS::Marketplace::purchase_dataset \
  --args u64:1
```

### Check User Statistics

```bash
aptos move view \
  --function-id YOUR_ADDRESS::Marketplace::get_user_stats \
  --args address:USER_ADDRESS
```

### View Active Datasets

```bash
aptos move view \
  --function-id YOUR_ADDRESS::Marketplace::get_active_datasets
```

## 🧪 Testing

### Run All Tests

```bash
aptos move test
```

### Run Specific Test

```bash
aptos move test --filter test_marketplace_flow
```

### Test Coverage

The test suite covers:

- Complete marketplace workflow (upload → purchase → reward)
- Reward system functionality
- Multi-user interactions
- Error conditions and edge cases
- Platform statistics and user tracking

## 🔧 Configuration

### Platform Fee

- Configurable percentage fee (0-20%)
- Collected by platform on each purchase
- Remainder goes to dataset seller

### Reward Pool

- Initial funding provided during deployment
- Replenishable by admin
- Used for milestone and bonus rewards

### Milestones (Default)

1. **First Upload** - 0.01 APT (1 dataset)
2. **Early Adopter** - 0.05 APT (5 datasets)
3. **Power Seller** - 0.1 APT (10 datasets)
4. **Data Champion** - 0.25 APT (25 datasets)

## 📊 Contract Functions

### Marketplace Contract

#### Entry Functions

- `initialize(admin, platform_fee_percentage, platform_fee_recipient)`
- `upload_dataset(account, ipfs_hash, title, description, category, price)`
- `purchase_dataset(buyer, dataset_id)`
- `deactivate_dataset(owner, dataset_id)`
- `update_dataset_price(owner, dataset_id, new_price)`

#### View Functions

- `get_dataset_count(): u64`
- `get_dataset_by_id(dataset_id): Option<Dataset>`
- `get_datasets_by_owner(owner): vector<Dataset>`
- `get_active_datasets(): vector<Dataset>`
- `get_user_stats(user): Option<UserStats>`
- `get_platform_stats(): (u64, u64, u64)`

### Reward System Contract

#### Entry Functions

- `initialize_reward_system(admin, initial_balance)`
- `add_milestone(admin, name, description, requirement, reward_amount)`
- `pay_bonus_reward(admin, recipient, amount, reason)`
- `check_milestones(user, datasets_uploaded)`
- `replenish_pool(admin, amount)`

#### View Functions

- `get_reward_pool_balance(): u64`
- `get_active_milestones(): vector<Milestone>`
- `get_user_achievements(user): Option<UserAchievements>`

## 🔒 Security Features

1. **Access Control**: Only dataset owners can modify their datasets
2. **Balance Verification**: Ensures sufficient funds before purchases
3. **Duplicate Prevention**: Users cannot purchase the same dataset twice
4. **Fee Validation**: Platform fees are capped at 20%
5. **Admin Controls**: Secure admin functions for system management

## 🌐 Integration with Frontend

After deployment, update your frontend configuration with:

1. **Package Address**: The deployed contract address
2. **Network**: Aptos testnet
3. **Function IDs**: Format as `PACKAGE_ADDRESS::MODULE::FUNCTION`

Example frontend integration:

```typescript
const MARKETPLACE_ADDRESS = "0xYourDeployedAddress";

// Upload dataset
const uploadTx = {
  function: `${MARKETPLACE_ADDRESS}::Marketplace::upload_dataset`,
  arguments: [ipfsHash, title, description, category, price],
};
```

## 📝 Event Monitoring

The contracts emit events for:

- Dataset uploads
- Dataset purchases
- Reward payments
- Milestone achievements
- Reward pool changes

These events can be monitored for real-time updates and analytics.

## 🐛 Troubleshooting

### Common Issues

1. **Compilation Errors**: Check Move.toml dependencies
2. **Test Failures**: Verify account setup and balances
3. **Deployment Failures**: Ensure sufficient APT balance
4. **Transaction Failures**: Check function arguments and permissions

### Debug Commands

```bash
# Check account balance
aptos account list --account YOUR_ADDRESS

# View account resources
aptos account list --query resources --account YOUR_ADDRESS

# Check transaction status
aptos transaction show --transaction-hash HASH
```

## 📚 Resources

- [Aptos Developer Documentation](https://aptos.dev)
- [Move Language Guide](https://aptos.dev/move)
- [Aptos CLI Reference](https://aptos.dev/tools/aptos-cli/)
- [Aptos Testnet Explorer](https://explorer.aptoslabs.com/?network=testnet)

## 🔄 Next Steps

1. Deploy contracts to testnet
2. Test all functions via CLI
3. Integrate with frontend application
4. Conduct thorough testing
5. Deploy to mainnet for production use

---

For questions or issues, please refer to the main project documentation or contact the development team.
