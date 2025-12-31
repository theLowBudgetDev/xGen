#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Natural Language to Rust Smart Contract Generator
/// Hackathon MVP - Free generation with rate limiting, NFT marketplace, and ratings
#[multiversx_sc::contract]
pub trait ContractGenerator {
    // ========== INITIALIZATION ==========

    #[init]
    fn init(&self) {
        self.daily_generation_limit().set(3u64);
        self.nft_minting_fee()
            .set(BigUint::from(50000000000000000u64)); // 0.05 EGLD
        self.platform_fee_percent().set(250u64); // 2.5% (basis points)
    }

    #[only_owner]
    #[endpoint(setTemplateNftTokenId)]
    fn set_template_nft_token_id(&self, token_id: TokenIdentifier) {
        self.template_nft_token_id().set(token_id);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ========== GENERATION SYSTEM (FREE with Rate Limiting) ==========

    #[endpoint(generateContract)]
    fn generate_contract(&self, description: ManagedBuffer, category: ManagedBuffer) -> u64 {
        let caller = self.blockchain().get_caller();

        // Check rate limit
        require!(
            self.check_and_update_rate_limit(&caller),
            "Daily generation limit reached (3/day)"
        );

        // Create generation request
        let generation_id = self.next_generation_id().get();

        let generation = Generation {
            id: generation_id,
            creator: caller.clone(),
            description: description.clone(),
            category: category.clone(),
            timestamp: self.blockchain().get_block_timestamp(),
            status: GenerationStatus::Pending,
            code_hash: ManagedBuffer::new(),
            nft_nonce: 0,
        };

        self.generations(generation_id).set(&generation);
        self.next_generation_id().set(generation_id + 1);

        // Track user's generations
        self.user_generation_count(&caller)
            .update(|count| *count += 1);

        // Emit event for backend AI service
        // Combine description and category for event (event log limitation)
        let mut combined = description.clone();
        combined.append_bytes(b"|||");
        combined.append(&category);

        self.generation_requested_event(generation_id, caller, combined);

        generation_id
    }

    /// Oracle callback - only contract owner (backend service) can call
    #[only_owner]
    #[endpoint(completeGeneration)]
    fn complete_generation(&self, generation_id: u64, code_hash: ManagedBuffer, success: bool) {
        require!(
            !self.generations(generation_id).is_empty(),
            "Generation not found"
        );

        self.generations(generation_id).update(|generation| {
            generation.status = if success {
                GenerationStatus::Completed
            } else {
                GenerationStatus::Failed
            };
            generation.code_hash = code_hash.clone();
        });

        let generation = self.generations(generation_id).get();

        self.generation_completed_event(generation_id, generation.creator, success, code_hash);
    }

    // ========== RATE LIMITING ==========

    fn check_and_update_rate_limit(&self, user: &ManagedAddress) -> bool {
        let current_day = self.blockchain().get_block_timestamp() / 86400; // Seconds in a day
        let last_day = self.user_last_generation_day(user).get();

        // Reset counter if it's a new day
        if current_day > last_day {
            self.user_generations_today(user).set(0);
            self.user_last_generation_day(user).set(current_day);
        }

        let generations_today = self.user_generations_today(user).get();
        let limit = self.daily_generation_limit().get();

        if generations_today >= limit {
            return false;
        }

        // Increment counter
        self.user_generations_today(user).set(generations_today + 1);
        true
    }

    // ========== NFT MINTING ==========

    #[payable("EGLD")]
    #[endpoint(mintTemplateNFT)]
    fn mint_template_nft(&self, generation_id: u64, name: ManagedBuffer) -> u64 {
        let payment = self.call_value().egld_value();
        let required_fee = self.nft_minting_fee().get();

        require!(
            payment.clone_value() >= required_fee,
            "Insufficient minting fee"
        );

        let generation = self.generations(generation_id).get();
        require!(
            generation.status == GenerationStatus::Completed,
            "Generation not completed"
        );
        require!(
            generation.creator == self.blockchain().get_caller(),
            "Not the creator"
        );
        require!(generation.nft_nonce == 0, "NFT already minted");

        let nft_token_id = self.template_nft_token_id().get();

        // Create NFT attributes
        let attributes = TemplateAttributes {
            generation_id,
            category: generation.category.clone(),
            code_hash: generation.code_hash.clone(),
            creation_date: generation.timestamp,
            uses: 0,
            total_rating: 0,
            rating_count: 0,
        };

        // Mint NFT with 2.5% royalty
        let royalties = BigUint::from(250u64); // 2.5% in basis points

        let nft_nonce = self.send().esdt_nft_create(
            &nft_token_id,
            &BigUint::from(1u64),
            &name,
            &royalties,
            &ManagedBuffer::new(),
            &attributes,
            &ManagedVec::new(),
        );

        // Update generation with NFT nonce
        self.generations(generation_id).update(|generation| {
            generation.nft_nonce = nft_nonce;
        });

        // Send NFT to creator
        let caller = self.blockchain().get_caller();
        self.send()
            .direct_esdt(&caller, &nft_token_id, nft_nonce, &BigUint::from(1u64));

        // Check for achievements
        self.check_first_generation_achievement(&caller);

        self.template_nft_minted_event(generation_id, nft_nonce, caller);

        nft_nonce
    }

    // ========== MARKETPLACE ==========

    #[payable("*")]
    #[endpoint(listTemplate)]
    fn list_template(&self, nft_nonce: u64, price: BigUint) -> u64 {
        let payment = self.call_value().single_esdt();
        let nft_token_id = self.template_nft_token_id().get();

        require!(payment.token_identifier == nft_token_id, "Wrong token");
        require!(payment.token_nonce == nft_nonce, "Wrong NFT nonce");
        require!(
            payment.amount == BigUint::from(1u64),
            "Must send exactly 1 NFT"
        );
        require!(price > BigUint::zero(), "Price must be greater than 0");

        let caller = self.blockchain().get_caller();
        let listing_id = self.next_listing_id().get();

        let listing = Listing {
            id: listing_id,
            seller: caller.clone(),
            nft_nonce,
            price: price.clone(),
            active: true,
        };

        self.listings(listing_id).set(&listing);
        self.next_listing_id().set(listing_id + 1);

        // Store NFT in contract
        // (already received via payable)

        self.template_listed_event(listing_id, nft_nonce, caller, price);

        listing_id
    }

    #[payable("EGLD")]
    #[endpoint(purchaseTemplate)]
    fn purchase_template(&self, listing_id: u64) {
        let payment = self.call_value().egld_value();
        let listing = self.listings(listing_id).get();

        require!(listing.active, "Listing not active");
        require!(
            payment.clone_value() >= listing.price,
            "Insufficient payment"
        );

        let buyer = self.blockchain().get_caller();
        require!(buyer != listing.seller, "Cannot buy your own template");

        // Calculate fees
        let platform_fee_percent = self.platform_fee_percent().get();
        let platform_fee = &listing.price * platform_fee_percent / 10000u64;
        let seller_amount = &listing.price - &platform_fee;

        // Send payment to seller
        self.send().direct_egld(&listing.seller, &seller_amount);

        // Platform fee stays in contract (can be withdrawn by owner)

        // Transfer NFT to buyer
        let nft_token_id = self.template_nft_token_id().get();
        self.send().direct_esdt(
            &buyer,
            &nft_token_id,
            listing.nft_nonce,
            &BigUint::from(1u64),
        );

        // Deactivate listing
        self.listings(listing_id).update(|l| {
            l.active = false;
        });

        // Update template usage stats
        self.template_uses(listing.nft_nonce)
            .update(|uses| *uses += 1);

        // Check for achievements
        self.check_first_sale_achievement(&listing.seller);
        self.check_popular_template_achievement(listing.nft_nonce);

        self.template_purchased_event(listing_id, buyer, listing.seller, listing.price);
    }

    #[only_owner]
    #[endpoint(cancelListing)]
    fn cancel_listing(&self, listing_id: u64) {
        let listing = self.listings(listing_id).get();
        require!(listing.active, "Listing not active");

        // Return NFT to seller
        let nft_token_id = self.template_nft_token_id().get();
        self.send().direct_esdt(
            &listing.seller,
            &nft_token_id,
            listing.nft_nonce,
            &BigUint::from(1u64),
        );

        // Deactivate listing
        self.listings(listing_id).update(|l| {
            l.active = false;
        });
    }

    // ========== RATING SYSTEM ==========

    #[endpoint(rateTemplate)]
    fn rate_template(&self, nft_nonce: u64, rating: u8) {
        require!(rating >= 1 && rating <= 5, "Rating must be 1-5");

        let caller = self.blockchain().get_caller();

        // Simple check: prevent duplicate ratings (can be improved)
        let user_rating_key = self.user_template_rating(&caller, nft_nonce);
        require!(user_rating_key.is_empty(), "Already rated this template");

        // Store user's rating
        user_rating_key.set(rating);

        // Update template aggregate rating
        self.template_ratings(nft_nonce).update(|attrs| {
            attrs.total_rating += rating as u64;
            attrs.rating_count += 1;
        });

        self.template_rated_event(nft_nonce, caller, rating);
    }

    // ========== ACHIEVEMENTS (Event-based, no NFT minting) ==========

    fn check_first_generation_achievement(&self, user: &ManagedAddress) {
        let count = self.user_generation_count(user).get();
        if count == 1 {
            self.achievement_earned_event(user.clone(), ManagedBuffer::from(b"First Generation"));
        }
    }

    fn check_first_sale_achievement(&self, user: &ManagedAddress) {
        // Simple implementation: emit event (frontend tracks)
        self.achievement_earned_event(user.clone(), ManagedBuffer::from(b"First Sale"));
    }

    fn check_popular_template_achievement(&self, nft_nonce: u64) {
        let uses = self.template_uses(nft_nonce).get();
        if uses == 10 {
            self.achievement_earned_event(
                ManagedAddress::zero(), // Template-based, not user-based
                ManagedBuffer::from(b"Popular Template"),
            );
        }
    }

    // ========== ADMIN FUNCTIONS ==========

    #[only_owner]
    #[endpoint(setDailyLimit)]
    fn set_daily_limit(&self, new_limit: u64) {
        self.daily_generation_limit().set(new_limit);
    }

    #[only_owner]
    #[endpoint(setMintingFee)]
    fn set_minting_fee(&self, new_fee: BigUint) {
        self.nft_minting_fee().set(new_fee);
    }

    #[only_owner]
    #[endpoint(withdrawFees)]
    fn withdraw_fees(&self) {
        let balance = self
            .blockchain()
            .get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        let owner = self.blockchain().get_owner_address();
        self.send().direct_egld(&owner, &balance);
    }

    // ========== VIEW FUNCTIONS ==========

    #[view(getGeneration)]
    fn get_generation(&self, generation_id: u64) -> Generation<Self::Api> {
        self.generations(generation_id).get()
    }

    #[view(getListing)]
    fn get_listing(&self, listing_id: u64) -> Listing<Self::Api> {
        self.listings(listing_id).get()
    }

    #[view(getUserGenerationsToday)]
    fn get_user_generations_today(&self, user: ManagedAddress) -> u64 {
        let current_day = self.blockchain().get_block_timestamp() / 86400;
        let last_day = self.user_last_generation_day(&user).get();

        if current_day > last_day {
            0 // New day, counter reset
        } else {
            self.user_generations_today(&user).get()
        }
    }

    #[view(getUserGenerationCount)]
    fn get_user_generation_count(&self, user: ManagedAddress) -> u64 {
        self.user_generation_count(&user).get()
    }

    #[view(getTemplateRating)]
    fn get_template_rating(&self, nft_nonce: u64) -> TemplateRatingInfo {
        self.template_ratings(nft_nonce).get()
    }

    #[view(getTemplateUses)]
    fn get_template_uses(&self, nft_nonce: u64) -> u64 {
        self.template_uses(nft_nonce).get()
    }

    #[view(getDailyLimit)]
    fn get_daily_limit(&self) -> u64 {
        self.daily_generation_limit().get()
    }

    #[view(getMintingFee)]
    fn get_minting_fee(&self) -> BigUint {
        self.nft_minting_fee().get()
    }

    // ========== STORAGE ==========

    #[storage_mapper("templateNftTokenId")]
    fn template_nft_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("dailyGenerationLimit")]
    fn daily_generation_limit(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("nftMintingFee")]
    fn nft_minting_fee(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("platformFeePercent")]
    fn platform_fee_percent(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("nextGenerationId")]
    fn next_generation_id(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("generations")]
    fn generations(&self, id: u64) -> SingleValueMapper<Generation<Self::Api>>;

    #[storage_mapper("nextListingId")]
    fn next_listing_id(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("listings")]
    fn listings(&self, id: u64) -> SingleValueMapper<Listing<Self::Api>>;

    #[storage_mapper("userGenerationsToday")]
    fn user_generations_today(&self, user: &ManagedAddress) -> SingleValueMapper<u64>;

    #[storage_mapper("userLastGenerationDay")]
    fn user_last_generation_day(&self, user: &ManagedAddress) -> SingleValueMapper<u64>;

    #[storage_mapper("userGenerationCount")]
    fn user_generation_count(&self, user: &ManagedAddress) -> SingleValueMapper<u64>;

    #[storage_mapper("templateUses")]
    fn template_uses(&self, nft_nonce: u64) -> SingleValueMapper<u64>;

    #[storage_mapper("templateRatings")]
    fn template_ratings(&self, nft_nonce: u64) -> SingleValueMapper<TemplateRatingInfo>;

    #[storage_mapper("userTemplateRating")]
    fn user_template_rating(&self, user: &ManagedAddress, nft_nonce: u64) -> SingleValueMapper<u8>;

    // ========== EVENTS ==========

    #[event("generationRequested")]
    fn generation_requested_event(
        &self,
        #[indexed] generation_id: u64,
        #[indexed] creator: ManagedAddress,
        description_and_category: ManagedBuffer,
    );

    #[event("generationCompleted")]
    fn generation_completed_event(
        &self,
        #[indexed] generation_id: u64,
        #[indexed] creator: ManagedAddress,
        #[indexed] success: bool,
        code_hash: ManagedBuffer,
    );

    #[event("templateNftMinted")]
    fn template_nft_minted_event(
        &self,
        #[indexed] generation_id: u64,
        #[indexed] nft_nonce: u64,
        #[indexed] creator: ManagedAddress,
    );

    #[event("templateListed")]
    fn template_listed_event(
        &self,
        #[indexed] listing_id: u64,
        #[indexed] nft_nonce: u64,
        #[indexed] seller: ManagedAddress,
        price: BigUint,
    );

    #[event("templatePurchased")]
    fn template_purchased_event(
        &self,
        #[indexed] listing_id: u64,
        #[indexed] buyer: ManagedAddress,
        #[indexed] seller: ManagedAddress,
        price: BigUint,
    );

    #[event("templateRated")]
    fn template_rated_event(
        &self,
        #[indexed] nft_nonce: u64,
        #[indexed] rater: ManagedAddress,
        rating: u8,
    );

    #[event("achievementEarned")]
    fn achievement_earned_event(&self, #[indexed] user: ManagedAddress, achievement: ManagedBuffer);
}

// ========== STRUCTS & ENUMS ==========

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Clone)]
pub struct Generation<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    pub description: ManagedBuffer<M>,
    pub category: ManagedBuffer<M>,
    pub timestamp: u64,
    pub status: GenerationStatus,
    pub code_hash: ManagedBuffer<M>,
    pub nft_nonce: u64,
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Clone)]
pub enum GenerationStatus {
    Pending,
    Completed,
    Failed,
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct TemplateAttributes<M: ManagedTypeApi> {
    pub generation_id: u64,
    pub category: ManagedBuffer<M>,
    pub code_hash: ManagedBuffer<M>,
    pub creation_date: u64,
    pub uses: u64,
    pub total_rating: u64,
    pub rating_count: u64,
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Listing<M: ManagedTypeApi> {
    pub id: u64,
    pub seller: ManagedAddress<M>,
    pub nft_nonce: u64,
    pub price: BigUint<M>,
    pub active: bool,
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Default)]
pub struct TemplateRatingInfo {
    pub total_rating: u64,
    pub rating_count: u64,
}
