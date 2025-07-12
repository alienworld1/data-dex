module DataDex::RewardSystem {
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::signer;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use std::vector;
    use std::option::{Self, Option};

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;
    const E_REWARD_POOL_EMPTY: u64 = 6;

    /// Bonus reward structure for special incentives
    struct BonusReward has store, drop, copy {
        recipient: address,
        amount: u64,
        reason: vector<u8>, // Reason for bonus (e.g., "First upload", "Top seller")
        timestamp: u64,
    }

    /// Milestone structure for achievement-based rewards
    struct Milestone has store, drop, copy {
        id: u64,
        name: vector<u8>,
        description: vector<u8>,
        requirement: u64, // Number of datasets uploaded/sold
        reward_amount: u64,
        is_active: bool,
    }

    /// Events for reward tracking
    struct BonusRewardPaidEvent has drop, store {
        recipient: address,
        amount: u64,
        reason: vector<u8>,
        timestamp: u64,
    }

    struct MilestoneAchievedEvent has drop, store {
        user: address,
        milestone_id: u64,
        milestone_name: vector<u8>,
        reward_amount: u64,
        timestamp: u64,
    }

    struct RewardPoolReplenishedEvent has drop, store {
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    /// Main reward system resource
    struct RewardPool has key {
        balance: u64, // Available reward balance
        total_rewards_paid: u64,
        bonus_rewards: vector<BonusReward>,
        milestones: vector<Milestone>,
        next_milestone_id: u64,
        admin: address,
        
        // Event handles
        bonus_reward_events: EventHandle<BonusRewardPaidEvent>,
        milestone_events: EventHandle<MilestoneAchievedEvent>,
        pool_replenished_events: EventHandle<RewardPoolReplenishedEvent>,
    }

    /// User achievement tracking
    struct UserAchievements has key, copy, drop {
        milestones_achieved: vector<u64>, // IDs of achieved milestones
        total_bonus_received: u64,
        last_milestone_check: u64, // Timestamp of last milestone evaluation
    }

    /// Initialize the reward system
    public entry fun initialize_reward_system(
        admin: &signer,
        initial_balance: u64
    ) acquires RewardPool {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<RewardPool>(admin_addr), E_ALREADY_INITIALIZED);

        // Transfer initial balance to the contract
        if (initial_balance > 0) {
            coin::transfer<AptosCoin>(admin, admin_addr, initial_balance);
        };

        let reward_pool = RewardPool {
            balance: initial_balance,
            total_rewards_paid: 0,
            bonus_rewards: vector::empty<BonusReward>(),
            milestones: vector::empty<Milestone>(),
            next_milestone_id: 1,
            admin: admin_addr,
            bonus_reward_events: account::new_event_handle<BonusRewardPaidEvent>(admin),
            milestone_events: account::new_event_handle<MilestoneAchievedEvent>(admin),
            pool_replenished_events: account::new_event_handle<RewardPoolReplenishedEvent>(admin),
        };

        move_to(admin, reward_pool);

        // Create default milestones
        create_default_milestones(admin);
    }

    /// Create default achievement milestones
    fun create_default_milestones(admin: &signer) acquires RewardPool {
        
        // First upload milestone
        add_milestone(
            admin,
            b"First Upload",
            b"Upload your first dataset to the marketplace",
            1,
            1000000 // 0.01 APT
        );

        // Early adopter milestone
        add_milestone(
            admin,
            b"Early Adopter",
            b"Upload 5 datasets to the marketplace",
            5,
            5000000 // 0.05 APT
        );

        // Power Seller milestone
        add_milestone(
            admin,
            b"Power Seller",
            b"Upload 10 datasets to the marketplace",
            10,
            10000000 // 0.1 APT
        );

        // Data Champion milestone
        add_milestone(
            admin,
            b"Data Champion",
            b"Upload 25 datasets to the marketplace",
            25,
            25000000 // 0.25 APT
        );
    }

    /// Add a new milestone (admin only)
    public entry fun add_milestone(
        admin: &signer,
        name: vector<u8>,
        description: vector<u8>,
        requirement: u64,
        reward_amount: u64
    ) acquires RewardPool {
        let admin_addr = signer::address_of(admin);
        let reward_pool = borrow_global_mut<RewardPool>(@DataDex);
        assert!(reward_pool.admin == admin_addr, E_UNAUTHORIZED);
        assert!(reward_amount > 0, E_INVALID_AMOUNT);

        let milestone = Milestone {
            id: reward_pool.next_milestone_id,
            name,
            description,
            requirement,
            reward_amount,
            is_active: true,
        };

        vector::push_back(&mut reward_pool.milestones, milestone);
        reward_pool.next_milestone_id = reward_pool.next_milestone_id + 1;
    }

    /// Pay bonus reward to a user (admin only)
    public entry fun pay_bonus_reward(
        admin: &signer,
        recipient: address,
        amount: u64,
        reason: vector<u8>
    ) acquires RewardPool {
        let admin_addr = signer::address_of(admin);
        let reward_pool = borrow_global_mut<RewardPool>(@DataDex);
        assert!(reward_pool.admin == admin_addr, E_UNAUTHORIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(reward_pool.balance >= amount, E_INSUFFICIENT_BALANCE);

        // Transfer reward
        coin::transfer<AptosCoin>(admin, recipient, amount);
        
        // Update pool balance and stats
        reward_pool.balance = reward_pool.balance - amount;
        reward_pool.total_rewards_paid = reward_pool.total_rewards_paid + amount;

        // Record bonus reward
        let current_time = timestamp::now_seconds();
        let bonus_reward = BonusReward {
            recipient,
            amount,
            reason,
            timestamp: current_time,
        };
        vector::push_back(&mut reward_pool.bonus_rewards, bonus_reward);

        // Note: User must initialize their own UserAchievements resource
        // by calling a separate initialization function

        // Emit event
        event::emit_event(&mut reward_pool.bonus_reward_events, BonusRewardPaidEvent {
            recipient,
            amount,
            reason,
            timestamp: current_time,
        });
    }

    /// Transfer milestone reward to user (admin only)
    public entry fun transfer_milestone_reward(
        admin: &signer,
        recipient: address,
        milestone_id: u64
    ) acquires RewardPool {
        let admin_addr = signer::address_of(admin);
        let reward_pool = borrow_global_mut<RewardPool>(@DataDex);
        assert!(reward_pool.admin == admin_addr, E_UNAUTHORIZED);

        // Find the milestone
        let i = 0;
        let len = vector::length(&reward_pool.milestones);
        let milestone_found = false;
        let reward_amount = 0;
        
        while (i < len) {
            let milestone = vector::borrow(&reward_pool.milestones, i);
            if (milestone.id == milestone_id) {
                milestone_found = true;
                reward_amount = milestone.reward_amount;
                break
            };
            i = i + 1;
        };
        
        assert!(milestone_found, E_INVALID_AMOUNT);
        assert!(reward_pool.balance >= reward_amount, E_INSUFFICIENT_BALANCE);

        // Transfer reward
        coin::transfer<AptosCoin>(admin, recipient, reward_amount);
        
        // Update pool balance
        reward_pool.balance = reward_pool.balance - reward_amount;
        reward_pool.total_rewards_paid = reward_pool.total_rewards_paid + reward_amount;
    }

    /// Initialize user achievements (must be called by the user)
    public entry fun initialize_user_achievements(user: &signer) {
        let user_addr = signer::address_of(user);
        assert!(!exists<UserAchievements>(user_addr), E_ALREADY_INITIALIZED);

        let achievements = UserAchievements {
            milestones_achieved: vector::empty<u64>(),
            total_bonus_received: 0,
            last_milestone_check: timestamp::now_seconds(),
        };
        move_to(user, achievements);
    }

    /// Check and reward milestones for a user
    public entry fun check_milestones(
        user: &signer,
        datasets_uploaded: u64
    ) acquires RewardPool, UserAchievements {
        let user_addr = signer::address_of(user);
        let reward_pool = borrow_global_mut<RewardPool>(@DataDex);
        
        if (!exists<UserAchievements>(user_addr)) {
            let achievements = UserAchievements {
                milestones_achieved: vector::empty<u64>(),
                total_bonus_received: 0,
                last_milestone_check: timestamp::now_seconds(),
            };
            move_to(user, achievements);
        };

        let user_achievements = borrow_global_mut<UserAchievements>(user_addr);
        let current_time = timestamp::now_seconds();
        
        // Check each milestone
        let i = 0;
        let len = vector::length(&reward_pool.milestones);
        while (i < len) {
            let milestone = vector::borrow(&reward_pool.milestones, i);
            
            // Check if milestone is active, user hasn't achieved it, and meets requirement
            if (milestone.is_active && 
                !vector::contains(&user_achievements.milestones_achieved, &milestone.id) &&
                datasets_uploaded >= milestone.requirement &&
                reward_pool.balance >= milestone.reward_amount) {
                
                // Note: In production, the reward transfer would be handled differently
                // For now, we'll just mark the milestone as achieved and emit the event
                // The actual reward transfer should be handled by the marketplace contract
                
                // Update pool and user stats
                reward_pool.balance = reward_pool.balance - milestone.reward_amount;
                reward_pool.total_rewards_paid = reward_pool.total_rewards_paid + milestone.reward_amount;
                vector::push_back(&mut user_achievements.milestones_achieved, milestone.id);
                
                // Emit event
                event::emit_event(&mut reward_pool.milestone_events, MilestoneAchievedEvent {
                    user: user_addr,
                    milestone_id: milestone.id,
                    milestone_name: milestone.name,
                    reward_amount: milestone.reward_amount,
                    timestamp: current_time,
                });
            };
            
            i = i + 1;
        };
        
        user_achievements.last_milestone_check = current_time;
    }

    /// Replenish the reward pool (admin only)
    public entry fun replenish_pool(
        admin: &signer,
        amount: u64
    ) acquires RewardPool {
        let admin_addr = signer::address_of(admin);
        let reward_pool = borrow_global_mut<RewardPool>(@DataDex);
        assert!(reward_pool.admin == admin_addr, E_UNAUTHORIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Transfer funds to increase pool balance
        coin::transfer<AptosCoin>(admin, admin_addr, amount);
        reward_pool.balance = reward_pool.balance + amount;

        // Emit event
        event::emit_event(&mut reward_pool.pool_replenished_events, RewardPoolReplenishedEvent {
            amount,
            new_balance: reward_pool.balance,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Deactivate a milestone (admin only)
    public entry fun deactivate_milestone(
        admin: &signer,
        milestone_id: u64
    ) acquires RewardPool {
        let admin_addr = signer::address_of(admin);
        let reward_pool = borrow_global_mut<RewardPool>(@DataDex);
        assert!(reward_pool.admin == admin_addr, E_UNAUTHORIZED);

        let i = 0;
        let len = vector::length(&reward_pool.milestones);
        while (i < len) {
            let milestone = vector::borrow_mut(&mut reward_pool.milestones, i);
            if (milestone.id == milestone_id) {
                milestone.is_active = false;
                break
            };
            i = i + 1;
        };
    }

    //
    // View functions
    //

    #[view]
    public fun get_reward_pool_balance(): u64 acquires RewardPool {
        let reward_pool = borrow_global<RewardPool>(@DataDex);
        reward_pool.balance
    }

    #[view]
    public fun get_total_rewards_paid(): u64 acquires RewardPool {
        let reward_pool = borrow_global<RewardPool>(@DataDex);
        reward_pool.total_rewards_paid
    }

    #[view]
    public fun get_active_milestones(): vector<Milestone> acquires RewardPool {
        let reward_pool = borrow_global<RewardPool>(@DataDex);
        let result = vector::empty<Milestone>();
        let i = 0;
        let len = vector::length(&reward_pool.milestones);
        
        while (i < len) {
            let milestone = vector::borrow(&reward_pool.milestones, i);
            if (milestone.is_active) {
                vector::push_back(&mut result, *milestone);
            };
            i = i + 1;
        };
        result
    }

    #[view]
    public fun get_user_achievements(user: address): Option<UserAchievements> acquires UserAchievements {
        if (exists<UserAchievements>(user)) {
            option::some(*borrow_global<UserAchievements>(user))
        } else {
            option::none<UserAchievements>()
        }
    }

    #[view]
    public fun get_bonus_rewards_for_user(user: address): vector<BonusReward> acquires RewardPool {
        let reward_pool = borrow_global<RewardPool>(@DataDex);
        let result = vector::empty<BonusReward>();
        let i = 0;
        let len = vector::length(&reward_pool.bonus_rewards);
        
        while (i < len) {
            let bonus = vector::borrow(&reward_pool.bonus_rewards, i);
            if (bonus.recipient == user) {
                vector::push_back(&mut result, *bonus);
            };
            i = i + 1;
        };
        result
    }
}
