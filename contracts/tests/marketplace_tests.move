#[test_only]
module DataDex::MarketplaceTests {
    use DataDex::Marketplace;
    use DataDex::RewardSystem;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use std::string::utf8;
    use std::signer;
    use std::vector;

    #[test(aptos_framework = @0x1, admin = @DataDex, seller = @0x123, buyer = @0x456)]
    public entry fun test_marketplace_flow(
        aptos_framework: signer,
        admin: signer,
        seller: signer,
        buyer: signer,
    ) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        
        // Initialize APT coin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework);
        
        // Create accounts with APT balance
        let admin_addr = signer::address_of(&admin);
        let seller_addr = signer::address_of(&seller);
        let buyer_addr = signer::address_of(&buyer);
        
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        // Mint APT for testing
        coin::register<AptosCoin>(&admin);
        coin::register<AptosCoin>(&seller);
        coin::register<AptosCoin>(&buyer);
        
        let admin_coins = coin::mint<AptosCoin>(1000000000, &mint_cap); // 10 APT
        let seller_coins = coin::mint<AptosCoin>(100000000, &mint_cap);  // 1 APT
        let buyer_coins = coin::mint<AptosCoin>(500000000, &mint_cap);   // 5 APT
        
        coin::deposit<AptosCoin>(admin_addr, admin_coins);
        coin::deposit<AptosCoin>(seller_addr, seller_coins);
        coin::deposit<AptosCoin>(buyer_addr, buyer_coins);
        
        // Initialize marketplace
        Marketplace::initialize(&admin, 5, admin_addr); // 5% platform fee
        
        // Initialize reward system
        RewardSystem::initialize_reward_system(&admin, 100000000); // 1 APT initial pool
        
        // Test dataset upload
        Marketplace::upload_dataset(
            &seller,
            utf8(b"QmXhJKgKJhGJhGJhGJhGJhGJhGJhGJhGJhGJhGJhGJh"), // Mock IPFS hash
            utf8(b"Sales Data Q1 2024"),
            utf8(b"Quarterly sales data for retail business"),
            utf8(b"Business Analytics"),
            50000000 // 0.5 APT
        );
        
        // Verify dataset was uploaded
        assert!(Marketplace::get_dataset_count() == 1, 1);
        
        let dataset_option = Marketplace::get_dataset_by_id(1);
        assert!(std::option::is_some(&dataset_option), 2);
        
        // Check milestones for seller (first upload)
        RewardSystem::check_milestones(&seller, 1);
        
        // Test dataset purchase
        let initial_buyer_balance = coin::balance<AptosCoin>(buyer_addr);
        let initial_seller_balance = coin::balance<AptosCoin>(seller_addr);
        
        Marketplace::purchase_dataset(&buyer, 1);
        
        // Verify purchase
        assert!(Marketplace::has_user_purchased_dataset(buyer_addr, 1), 3);
        
        // Check balance changes
        let final_buyer_balance = coin::balance<AptosCoin>(buyer_addr);
        let final_seller_balance = coin::balance<AptosCoin>(seller_addr);
        
        assert!(final_buyer_balance == initial_buyer_balance - 50000000, 4); // Buyer paid 0.5 APT
        assert!(final_seller_balance > initial_seller_balance, 5); // Seller received payment (minus platform fee)
        
        // Test that buyer cannot purchase same dataset again
        // This should fail
        // Marketplace::purchase_dataset(&buyer, 1);
        
        // Test dataset price update
        Marketplace::update_dataset_price(&seller, 1, 60000000); // 0.6 APT
        
        // Test dataset deactivation
        Marketplace::deactivate_dataset(&seller, 1);
        
        // Verify platform stats
        let (total_datasets, total_purchases, active_datasets) = Marketplace::get_platform_stats();
        assert!(total_datasets == 1, 6);
        assert!(total_purchases == 1, 7);
        assert!(active_datasets == 0, 8); // Dataset was deactivated
        
        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @DataDex, user = @0x123)]
    public entry fun test_reward_system(
        aptos_framework: signer,
        admin: signer,
        user: signer,
    ) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        
        // Initialize APT coin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework);
        
        let admin_addr = signer::address_of(&admin);
        let user_addr = signer::address_of(&user);
        
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);
        
        coin::register<AptosCoin>(&admin);
        coin::register<AptosCoin>(&user);
        
        let admin_coins = coin::mint<AptosCoin>(1000000000, &mint_cap); // 10 APT
        let user_coins = coin::mint<AptosCoin>(100000000, &mint_cap);   // 1 APT
        
        coin::deposit<AptosCoin>(admin_addr, admin_coins);
        coin::deposit<AptosCoin>(user_addr, user_coins);
        
        // Initialize reward system
        RewardSystem::initialize_reward_system(&admin, 100000000); // 1 APT initial pool
        
        // Initialize user achievements
        RewardSystem::initialize_user_achievements(&user);
        
        // Check initial pool balance
        assert!(RewardSystem::get_reward_pool_balance() == 100000000, 1);
        
        // Test milestone achievement (first upload)
        let initial_balance = coin::balance<AptosCoin>(user_addr);
        RewardSystem::check_milestones(&user, 1); // 1 dataset uploaded
        
        // Manually transfer milestone reward (in production this would be automated)
        RewardSystem::transfer_milestone_reward(&admin, user_addr, 1); // Transfer first upload milestone
        
        // User should receive first upload milestone reward
        let final_balance = coin::balance<AptosCoin>(user_addr);
        assert!(final_balance > initial_balance, 2);
        
        // Test bonus reward
        let before_bonus = coin::balance<AptosCoin>(user_addr);
        RewardSystem::pay_bonus_reward(
            &admin,
            user_addr,
            5000000, // 0.05 APT
            b"Excellent data quality"
        );
        let after_bonus = coin::balance<AptosCoin>(user_addr);
        assert!(after_bonus == before_bonus + 5000000, 3);
        
        // Test pool replenishment
        RewardSystem::replenish_pool(&admin, 50000000); // Add 0.5 APT
        
        // Test milestone for multiple uploads
        RewardSystem::check_milestones(&user, 5); // 5 datasets uploaded (early adopter)
        
        // Verify user achievements
        let achievements_option = RewardSystem::get_user_achievements(user_addr);
        assert!(std::option::is_some(&achievements_option), 4);
        
        // Get active milestones
        let active_milestones = RewardSystem::get_active_milestones();
        assert!(vector::length(&active_milestones) > 0, 5);
        
        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(admin = @DataDex)]
    public entry fun test_marketplace_initialization(admin: signer) {
        let admin_addr = signer::address_of(&admin);
        account::create_account_for_test(admin_addr);
        
        // Test marketplace initialization
        Marketplace::initialize(&admin, 10, admin_addr); // 10% platform fee
        
        // Verify initial state
        assert!(Marketplace::get_dataset_count() == 0, 1);
        
        let (total_datasets, total_purchases, active_datasets) = Marketplace::get_platform_stats();
        assert!(total_datasets == 0, 2);
        assert!(total_purchases == 0, 3);
        assert!(active_datasets == 0, 4);
    }

    #[test(aptos_framework = @0x1, admin = @DataDex, user1 = @0x123, user2 = @0x456)]
    public entry fun test_multiple_users(
        aptos_framework: signer,
        admin: signer,
        user1: signer,
        user2: signer,
    ) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        
        // Initialize APT coin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&aptos_framework);
        
        let admin_addr = signer::address_of(&admin);
        let user1_addr = signer::address_of(&user1);
        let user2_addr = signer::address_of(&user2);
        
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);
        
        coin::register<AptosCoin>(&admin);
        coin::register<AptosCoin>(&user1);
        coin::register<AptosCoin>(&user2);
        
        let admin_coins = coin::mint<AptosCoin>(1000000000, &mint_cap);
        let user1_coins = coin::mint<AptosCoin>(500000000, &mint_cap);
        let user2_coins = coin::mint<AptosCoin>(500000000, &mint_cap);
        
        coin::deposit<AptosCoin>(admin_addr, admin_coins);
        coin::deposit<AptosCoin>(user1_addr, user1_coins);
        coin::deposit<AptosCoin>(user2_addr, user2_coins);
        
        // Initialize marketplace
        Marketplace::initialize(&admin, 3, admin_addr); // 3% platform fee
        
        // User1 uploads dataset
        Marketplace::upload_dataset(
            &user1,
            utf8(b"QmHash1"),
            utf8(b"Dataset 1"),
            utf8(b"Description 1"),
            utf8(b"Category A"),
            30000000 // 0.3 APT
        );
        
        // User2 uploads dataset
        Marketplace::upload_dataset(
            &user2,
            utf8(b"QmHash2"),
            utf8(b"Dataset 2"),
            utf8(b"Description 2"),
            utf8(b"Category B"),
            40000000 // 0.4 APT
        );
        
        // Verify both datasets exist
        assert!(Marketplace::get_dataset_count() == 2, 1);
        
        // User2 purchases User1's dataset
        Marketplace::purchase_dataset(&user2, 1);
        
        // User1 purchases User2's dataset
        Marketplace::purchase_dataset(&user1, 2);
        
        // Verify purchases
        assert!(Marketplace::has_user_purchased_dataset(user2_addr, 1), 2);
        assert!(Marketplace::has_user_purchased_dataset(user1_addr, 2), 3);
        
        // Check user stats
        let user1_stats_option = Marketplace::get_user_stats(user1_addr);
        let user2_stats_option = Marketplace::get_user_stats(user2_addr);
        
        assert!(std::option::is_some(&user1_stats_option), 4);
        assert!(std::option::is_some(&user2_stats_option), 5);
        
        // Verify datasets by owner
        let user1_datasets = Marketplace::get_datasets_by_owner(user1_addr);
        let user2_datasets = Marketplace::get_datasets_by_owner(user2_addr);
        
        assert!(vector::length(&user1_datasets) == 1, 6);
        assert!(vector::length(&user2_datasets) == 1, 7);
        
        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}
