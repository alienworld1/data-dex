#!/bin/bash

# DataDex Contract Deployment Script for Aptos Testnet
# This script handles the compilation, testing, and deployment of DataDex smart contracts

set -e

echo "🚀 DataDex Contract Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="testnet"
PROFILE="default"
PLATFORM_FEE_PERCENTAGE=5  # 5% platform fee
INITIAL_REWARD_POOL=100000000  # 1 APT (in octas)

print_step() {
    echo -e "${BLUE}📍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Aptos CLI is installed
check_aptos_cli() {
    print_step "Checking Aptos CLI installation..."
    if ! command -v aptos &> /dev/null; then
        print_error "Aptos CLI is not installed. Please install it from: https://aptos.dev/tools/aptos-cli/"
        exit 1
    fi
    print_success "Aptos CLI found"
}

# Initialize Aptos configuration if needed
init_aptos_config() {
    print_step "Checking Aptos configuration..."
    
    if [ ! -f ~/.aptos/config.yaml ]; then
        print_warning "Aptos configuration not found. Initializing..."
        aptos init --profile $PROFILE --network $NETWORK
        print_success "Aptos configuration initialized"
    else
        print_success "Aptos configuration found"
    fi
}

# Compile contracts
compile_contracts() {
    print_step "Compiling Move contracts..."
    
    if aptos move compile --dev; then
        print_success "Contracts compiled successfully"
    else
        print_error "Contract compilation failed"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_step "Running contract tests..."
    
    if aptos move test --dev; then
        print_success "All tests passed"
    else
        print_error "Tests failed"
        exit 1
    fi
}

# Fund account for deployment
fund_account() {
    print_step "Checking account balance and funding if needed..."
    
    local account_address=$(aptos config show-profiles --profile $PROFILE | grep "account" | awk '{print $2}')
    print_step "Account address: $account_address"
    
    local balance=$(aptos account list --account $account_address --query balance 2>/dev/null || echo "0")
    print_step "Current balance: $balance octas"
    
    # Request faucet funds if balance is low (less than 1 APT)
    if [ "$balance" -lt "100000000" ]; then
        print_step "Balance is low. Requesting funds from faucet..."
        if aptos account fund-with-faucet --account $account_address; then
            print_success "Account funded successfully"
        else
            print_warning "Faucet funding failed. Please ensure you have sufficient APT for deployment."
        fi
    else
        print_success "Account has sufficient balance"
    fi
}

# Publish contracts
publish_contracts() {
    print_step "Publishing contracts to Aptos testnet..."
    
    if aptos move publish --profile $PROFILE; then
        print_success "Contracts published successfully"
        
        # Get the package address
        local package_address=$(aptos config show-profiles --profile $PROFILE | grep "account" | awk '{print $2}')
        echo -e "${GREEN}📦 Package Address: $package_address${NC}"
        
        return 0
    else
        print_error "Contract publishing failed"
        exit 1
    fi
}

# Initialize marketplace
initialize_marketplace() {
    print_step "Initializing marketplace..."
    
    local account_address=$(aptos config show-profiles --profile $PROFILE | grep "account" | awk '{print $2}')
    
    if aptos move run \
        --function-id ${account_address}::Marketplace::initialize \
        --args u64:$PLATFORM_FEE_PERCENTAGE address:$account_address \
        --profile $PROFILE; then
        print_success "Marketplace initialized with $PLATFORM_FEE_PERCENTAGE% platform fee"
    else
        print_error "Marketplace initialization failed"
        exit 1
    fi
}

# Initialize reward system
initialize_reward_system() {
    print_step "Initializing reward system..."
    
    local account_address=$(aptos config show-profiles --profile $PROFILE | grep "account" | awk '{print $2}')
    
    if aptos move run \
        --function-id ${account_address}::RewardSystem::initialize_reward_system \
        --args u64:$INITIAL_REWARD_POOL \
        --profile $PROFILE; then
        print_success "Reward system initialized with $(echo "scale=8; $INITIAL_REWARD_POOL / 100000000" | bc) APT initial pool"
    else
        print_error "Reward system initialization failed"
        exit 1
    fi
}

# Display deployment summary
show_deployment_summary() {
    local account_address=$(aptos config show-profiles --profile $PROFILE | grep "account" | awk '{print $2}')
    
    echo ""
    echo -e "${GREEN}🎉 DataDex Deployment Complete!${NC}"
    echo "=================================="
    echo -e "${BLUE}Package Address:${NC} $account_address"
    echo -e "${BLUE}Network:${NC} $NETWORK"
    echo -e "${BLUE}Platform Fee:${NC} $PLATFORM_FEE_PERCENTAGE%"
    echo -e "${BLUE}Initial Reward Pool:${NC} $(echo "scale=8; $INITIAL_REWARD_POOL / 100000000" | bc) APT"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Update your frontend configuration with the package address: $account_address"
    echo "2. Test the marketplace functions using the Aptos Explorer"
    echo "3. Configure your frontend to connect to these contracts"
    echo ""
    echo -e "${BLUE}🔍 Useful Commands:${NC}"
    echo "- View account: aptos account list --account $account_address"
    echo "- Check resources: aptos account list --query resources --account $account_address"
    echo "- Aptos Explorer: https://explorer.aptoslabs.com/account/$account_address?network=testnet"
}

# Parse command line arguments
SKIP_TESTS=false
SKIP_INIT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-init)
            SKIP_INIT=true
            shift
            ;;
        --platform-fee)
            PLATFORM_FEE_PERCENTAGE="$2"
            shift 2
            ;;
        --reward-pool)
            INITIAL_REWARD_POOL="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --help)
            echo "DataDex Contract Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-tests          Skip running tests before deployment"
            echo "  --skip-init           Skip contract initialization after deployment"
            echo "  --platform-fee NUM    Set platform fee percentage (default: 5)"
            echo "  --reward-pool NUM     Set initial reward pool in octas (default: 100000000)"
            echo "  --profile PROFILE     Use specific Aptos CLI profile (default: default)"
            echo "  --help                Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --platform-fee 3 --reward-pool 200000000"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main deployment flow
main() {
    echo -e "${BLUE}Configuration:${NC}"
    echo "- Network: $NETWORK"
    echo "- Profile: $PROFILE"
    echo "- Platform Fee: $PLATFORM_FEE_PERCENTAGE%"
    echo "- Initial Reward Pool: $(echo "scale=8; $INITIAL_REWARD_POOL / 100000000" | bc) APT"
    echo "- Skip Tests: $SKIP_TESTS"
    echo "- Skip Initialization: $SKIP_INIT"
    echo ""
    
    check_aptos_cli
    # init_aptos_config
    fund_account
    compile_contracts
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests as requested"
    fi
    
    publish_contracts
    
    if [ "$SKIP_INIT" = false ]; then
        initialize_marketplace
        initialize_reward_system
    else
        print_warning "Skipping contract initialization as requested"
    fi
    
    show_deployment_summary
}

# Run main function
main
