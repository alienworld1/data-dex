module DataDex::Marketplace {
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::signer;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use std::string::String;
    use std::vector;
    use std::option::{Self, Option};

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_DATASET_NOT_FOUND: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_UNAUTHORIZED: u64 = 5;
    const E_INVALID_PRICE: u64 = 6;
    const E_DATASET_ALREADY_PURCHASED: u64 = 7;

    /// Dataset structure containing metadata
    struct Dataset has store, drop, copy {
        id: u64,
        ipfs_hash: String,
        title: String,
        description: String,
        category: String,
        price: u64, // Price in APT (octas)
        owner: address,
        created_at: u64,
        total_purchases: u64,
        is_active: bool,
    }

    /// Purchase record for tracking who bought what
    struct Purchase has store, drop, copy {
        dataset_id: u64,
        buyer: address,
        seller: address,
        price: u64,
        purchased_at: u64,
    }

    /// Events for tracking marketplace activity
    struct DatasetUploadedEvent has drop, store {
        dataset_id: u64,
        owner: address,
        ipfs_hash: String,
        title: String,
        price: u64,
        timestamp: u64,
    }

    struct DatasetPurchasedEvent has drop, store {
        dataset_id: u64,
        buyer: address,
        seller: address,
        price: u64,
        timestamp: u64,
    }

    struct RewardPaidEvent has drop, store {
        recipient: address,
        amount: u64,
        dataset_id: u64,
        timestamp: u64,
    }

    /// Main marketplace resource
    struct DataMarketplace has key {
        datasets: vector<Dataset>,
        purchases: vector<Purchase>,
        next_dataset_id: u64,
        platform_fee_percentage: u64, // Fee percentage (e.g., 5 = 5%)
        platform_fee_recipient: address,
        
        // Event handles
        dataset_uploaded_events: EventHandle<DatasetUploadedEvent>,
        dataset_purchased_events: EventHandle<DatasetPurchasedEvent>,
        reward_paid_events: EventHandle<RewardPaidEvent>,
    }

    /// User statistics for tracking individual user data
    struct UserStats has key, copy, drop {
        datasets_uploaded: u64,
        datasets_purchased: u64,
        total_earned: u64,
        total_spent: u64,
    }

    /// Initialize the marketplace (should be called by the contract deployer)
    public entry fun initialize(
        admin: &signer,
        platform_fee_percentage: u64,
        platform_fee_recipient: address
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<DataMarketplace>(admin_addr), E_ALREADY_INITIALIZED);
        assert!(platform_fee_percentage <= 20, E_INVALID_PRICE); // Max 20% fee

        let marketplace = DataMarketplace {
            datasets: vector::empty<Dataset>(),
            purchases: vector::empty<Purchase>(),
            next_dataset_id: 1,
            platform_fee_percentage,
            platform_fee_recipient,
            dataset_uploaded_events: account::new_event_handle<DatasetUploadedEvent>(admin),
            dataset_purchased_events: account::new_event_handle<DatasetPurchasedEvent>(admin),
            reward_paid_events: account::new_event_handle<RewardPaidEvent>(admin),
        };

        move_to(admin, marketplace);
    }

    /// Upload a new dataset to the marketplace
    public entry fun upload_dataset(
        account: &signer,
        ipfs_hash: String,
        title: String,
        description: String,
        category: String,
        price: u64
    ) acquires DataMarketplace, UserStats {
        assert!(price > 0, E_INVALID_PRICE);
        
        let marketplace = borrow_global_mut<DataMarketplace>(@DataDex);
        let owner = signer::address_of(account);
        let dataset_id = marketplace.next_dataset_id;
        let current_time = timestamp::now_seconds();

        let dataset = Dataset {
            id: dataset_id,
            ipfs_hash,
            title,
            description,
            category,
            price,
            owner,
            created_at: current_time,
            total_purchases: 0,
            is_active: true,
        };

        vector::push_back(&mut marketplace.datasets, dataset);
        marketplace.next_dataset_id = dataset_id + 1;

        // Update user stats
        if (!exists<UserStats>(owner)) {
            let user_stats = UserStats {
                datasets_uploaded: 0,
                datasets_purchased: 0,
                total_earned: 0,
                total_spent: 0,
            };
            move_to(account, user_stats);
        };

        let user_stats = borrow_global_mut<UserStats>(owner);
        user_stats.datasets_uploaded = user_stats.datasets_uploaded + 1;

        // Emit event
        event::emit_event(&mut marketplace.dataset_uploaded_events, DatasetUploadedEvent {
            dataset_id,
            owner,
            ipfs_hash: dataset.ipfs_hash,
            title: dataset.title,
            price,
            timestamp: current_time,
        });
    }

    /// Purchase a dataset and transfer payment to the seller
    public entry fun purchase_dataset(
        buyer: &signer,
        dataset_id: u64
    ) acquires DataMarketplace, UserStats {
        let marketplace = borrow_global_mut<DataMarketplace>(@DataDex);
        let buyer_addr = signer::address_of(buyer);
        
        // Find the dataset
        let dataset_option = find_dataset_by_id(&marketplace.datasets, dataset_id);
        assert!(option::is_some(&dataset_option), E_DATASET_NOT_FOUND);
        
        let dataset_index = option::extract(&mut dataset_option);
        let dataset = vector::borrow_mut(&mut marketplace.datasets, dataset_index);
        
        assert!(dataset.is_active, E_DATASET_NOT_FOUND);
        assert!(dataset.owner != buyer_addr, E_UNAUTHORIZED); // Can't buy your own dataset
        
        // Check if buyer has already purchased this dataset
        assert!(!has_purchased_dataset(&marketplace.purchases, buyer_addr, dataset_id), E_DATASET_ALREADY_PURCHASED);
        
        let price = dataset.price;
        let seller_addr = dataset.owner;
        
        // Check buyer balance
        assert!(coin::balance<AptosCoin>(buyer_addr) >= price, E_INSUFFICIENT_BALANCE);
        
        // Calculate platform fee
        let platform_fee = (price * marketplace.platform_fee_percentage) / 100;
        let seller_amount = price - platform_fee;
        
        // Transfer payment
        if (platform_fee > 0) {
            coin::transfer<AptosCoin>(buyer, marketplace.platform_fee_recipient, platform_fee);
        };
        coin::transfer<AptosCoin>(buyer, seller_addr, seller_amount);
        
        // Record the purchase
        let current_time = timestamp::now_seconds();
        let purchase = Purchase {
            dataset_id,
            buyer: buyer_addr,
            seller: seller_addr,
            price,
            purchased_at: current_time,
        };
        vector::push_back(&mut marketplace.purchases, purchase);
        
        // Update dataset stats
        dataset.total_purchases = dataset.total_purchases + 1;
        
        // Update user stats for buyer
        if (!exists<UserStats>(buyer_addr)) {
            let user_stats = UserStats {
                datasets_uploaded: 0,
                datasets_purchased: 0,
                total_earned: 0,
                total_spent: 0,
            };
            move_to(buyer, user_stats);
        };
        let buyer_stats = borrow_global_mut<UserStats>(buyer_addr);
        buyer_stats.datasets_purchased = buyer_stats.datasets_purchased + 1;
        buyer_stats.total_spent = buyer_stats.total_spent + price;
        
        // Update user stats for seller (skip if seller doesn't have stats resource)
        if (exists<UserStats>(seller_addr)) {
            let seller_stats = borrow_global_mut<UserStats>(seller_addr);
            seller_stats.total_earned = seller_stats.total_earned + seller_amount;
        };
        
        // Emit events
        event::emit_event(&mut marketplace.dataset_purchased_events, DatasetPurchasedEvent {
            dataset_id,
            buyer: buyer_addr,
            seller: seller_addr,
            price,
            timestamp: current_time,
        });
        
        event::emit_event(&mut marketplace.reward_paid_events, RewardPaidEvent {
            recipient: seller_addr,
            amount: seller_amount,
            dataset_id,
            timestamp: current_time,
        });
    }

    /// Deactivate a dataset (only owner can do this)
    public entry fun deactivate_dataset(
        owner: &signer,
        dataset_id: u64
    ) acquires DataMarketplace {
        let marketplace = borrow_global_mut<DataMarketplace>(@DataDex);
        let owner_addr = signer::address_of(owner);
        
        let dataset_option = find_dataset_by_id(&marketplace.datasets, dataset_id);
        assert!(option::is_some(&dataset_option), E_DATASET_NOT_FOUND);
        
        let dataset_index = option::extract(&mut dataset_option);
        let dataset = vector::borrow_mut(&mut marketplace.datasets, dataset_index);
        
        assert!(dataset.owner == owner_addr, E_UNAUTHORIZED);
        dataset.is_active = false;
    }

    /// Update dataset price (only owner can do this)
    public entry fun update_dataset_price(
        owner: &signer,
        dataset_id: u64,
        new_price: u64
    ) acquires DataMarketplace {
        assert!(new_price > 0, E_INVALID_PRICE);
        
        let marketplace = borrow_global_mut<DataMarketplace>(@DataDex);
        let owner_addr = signer::address_of(owner);
        
        let dataset_option = find_dataset_by_id(&marketplace.datasets, dataset_id);
        assert!(option::is_some(&dataset_option), E_DATASET_NOT_FOUND);
        
        let dataset_index = option::extract(&mut dataset_option);
        let dataset = vector::borrow_mut(&mut marketplace.datasets, dataset_index);
        
        assert!(dataset.owner == owner_addr, E_UNAUTHORIZED);
        dataset.price = new_price;
    }

    /// Helper function to find dataset by ID
    fun find_dataset_by_id(datasets: &vector<Dataset>, dataset_id: u64): Option<u64> {
        let i = 0;
        let len = vector::length(datasets);
        while (i < len) {
            let dataset = vector::borrow(datasets, i);
            if (dataset.id == dataset_id) {
                return option::some(i)
            };
            i = i + 1;
        };
        option::none<u64>()
    }

    /// Helper function to check if user has already purchased a dataset
    fun has_purchased_dataset(purchases: &vector<Purchase>, buyer: address, dataset_id: u64): bool {
        let i = 0;
        let len = vector::length(purchases);
        while (i < len) {
            let purchase = vector::borrow(purchases, i);
            if (purchase.buyer == buyer && purchase.dataset_id == dataset_id) {
                return true
            };
            i = i + 1;
        };
        false
    }

    //
    // View functions for querying data
    //

    #[view]
    public fun get_dataset_count(): u64 acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        vector::length(&marketplace.datasets)
    }

    #[view]
    public fun get_dataset_by_id(dataset_id: u64): Option<Dataset> acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        let dataset_option = find_dataset_by_id(&marketplace.datasets, dataset_id);
        if (option::is_some(&dataset_option)) {
            let index = option::extract(&mut dataset_option);
            option::some(*vector::borrow(&marketplace.datasets, index))
        } else {
            option::none<Dataset>()
        }
    }

    #[view]
    public fun get_datasets_by_owner(owner: address): vector<Dataset> acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        let result = vector::empty<Dataset>();
        let i = 0;
        let len = vector::length(&marketplace.datasets);
        
        while (i < len) {
            let dataset = vector::borrow(&marketplace.datasets, i);
            if (dataset.owner == owner) {
                vector::push_back(&mut result, *dataset);
            };
            i = i + 1;
        };
        result
    }

    #[view]
    public fun get_active_datasets(): vector<Dataset> acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        let result = vector::empty<Dataset>();
        let i = 0;
        let len = vector::length(&marketplace.datasets);
        
        while (i < len) {
            let dataset = vector::borrow(&marketplace.datasets, i);
            if (dataset.is_active) {
                vector::push_back(&mut result, *dataset);
            };
            i = i + 1;
        };
        result
    }

    #[view]
    public fun get_user_stats(user: address): Option<UserStats> acquires UserStats {
        if (exists<UserStats>(user)) {
            option::some(*borrow_global<UserStats>(user))
        } else {
            option::none<UserStats>()
        }
    }

    #[view]
    public fun get_purchases_by_buyer(buyer: address): vector<Purchase> acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        let result = vector::empty<Purchase>();
        let i = 0;
        let len = vector::length(&marketplace.purchases);
        
        while (i < len) {
            let purchase = vector::borrow(&marketplace.purchases, i);
            if (purchase.buyer == buyer) {
                vector::push_back(&mut result, *purchase);
            };
            i = i + 1;
        };
        result
    }

    #[view]
    public fun has_user_purchased_dataset(buyer: address, dataset_id: u64): bool acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        has_purchased_dataset(&marketplace.purchases, buyer, dataset_id)
    }

    #[view]
    public fun get_platform_stats(): (u64, u64, u64) acquires DataMarketplace {
        let marketplace = borrow_global<DataMarketplace>(@DataDex);
        let total_datasets = vector::length(&marketplace.datasets);
        let total_purchases = vector::length(&marketplace.purchases);
        let active_datasets = vector::length(&get_active_datasets());
        (total_datasets, total_purchases, active_datasets)
    }
}
