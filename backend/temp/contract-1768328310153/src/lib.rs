#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// The PingPong contract allows users to "ping" by sending EGLD,
/// and the last pinger can "claim a pong" (a small fixed EGLD amount)
/// set by the contract owner.
#[multiversx_sc::contract]
pub trait PingPong {
    /// Initializes the contract, setting the owner and a default pong amount.
    ///
    /// The owner is set to the address that deploys the contract.
    /// A default `pong_amount` is set to 100000000000000000 (0.1 EGLD).
    #[init]
    fn init(&self) {
        // Set the contract owner to the caller's address.
        self.owner().set(self.blockchain().get_caller());
        // Set an initial default pong amount (0.1 EGLD).
        self.pong_amount().set(BigUint::from(100_000_000_000_000_000u64));
        // Initialize total pings to zero.
        self.total_pings().set(0);
        // Initialize last_pinger to a zero address, indicating no pending pong.
        self.last_pinger().set(ManagedAddress::zero());
        // Initialize last_ping_amount to zero.
        self.last_ping_amount().set(BigUint::zero());
    }

    /// An empty upgrade function.
    /// It's a best practice to include this for potential future contract upgrades.
    #[upgrade]
    fn upgrade(&self) {}

    /// Allows any user to "ping" the contract by sending EGLD.
    ///
    /// The sent EGLD is held by the contract.
    /// The caller becomes the `last_pinger` and their amount is recorded.
    /// This overwrites any previous `last_pinger` status.
    ///
    /// # Payment
    /// This function is `payable` and expects EGLD to be sent with the transaction.
    #[payable("EGLD")]
    #[endpoint]
    fn ping(&self) {
        let caller = self.blockchain().get_caller();
        let ping_amount = self.call_value().egld_value();
        let current_timestamp = self.blockchain().get_block_timestamp();

        // Ensure that a positive amount of EGLD is sent.
        require!(
            ping_amount > 0,
            "Ping amount must be greater than zero"
        );

        // Update the contract state with the new ping information.
        // State updates happen before any potential external calls to prevent reentrancy issues.
        self.last_pinger().set(caller.clone());
        self.last_ping_amount().set(ping_amount.clone());
        self.last_ping_timestamp().set(current_timestamp);

        // Increment the total number of pings.
        self.total_pings().update(|value| *value += 1);

        // Emit an event for the successful ping.
        self.emit_ping_event(caller, ping_amount, current_timestamp);
    }

    /// Allows the contract owner to set the amount of EGLD returned as a "pong".
    ///
    /// # Arguments
    /// * `amount` - The new amount of EGLD to be set as the pong value. Must be greater than zero.
    #[only_owner]
    #[endpoint]
    fn set_pong_amount(&self, amount: BigUint) {
        // Ensure the pong amount is positive.
        require!(
            amount > 0,
            "Pong amount must be greater than zero"
        );

        // Update the pong amount in storage.
        self.pong_amount().set(amount.clone());

        // Emit an event for the updated pong amount.
        self.emit_set_pong_amount_event(amount, self.blockchain().get_caller(), self.blockchain().get_block_timestamp());
    }

    /// Allows the `last_pinger` to claim their "pong" amount.
    ///
    /// The `pong_amount` (set by the owner) is sent from the contract to the `last_pinger`.
    /// This action consumes the pending pong, resetting the `last_pinger` state.
    #[endpoint]
    fn claim_pong(&self) {
        let caller = self.blockchain().get_caller();
        let last_pinger_address = self.last_pinger().get();
        let pong_amount_to_send = self.pong_amount().get();
        let contract_balance = self.blockchain().get_balance(self.blockchain().get_sc_address());
        let current_timestamp = self.blockchain().get_block_timestamp();

        // Require that there is a pending pong to claim (i.e., last_pinger is not zero address).
        require!(
            last_pinger_address != ManagedAddress::zero(),
            "No pending pong to claim. Be the last pinger!"
        );
        // Require that the caller is indeed the last pinger.
        require!(
            caller == last_pinger_address,
            "Only the last pinger can claim the pong"
        );
        // Require that the contract has sufficient balance to send the pong.
        require!(
            contract_balance >= pong_amount_to_send,
            "Insufficient contract balance to send pong. Contract needs more EGLD."
        );
        // Require that the pong amount itself is positive.
        require!(
            pong_amount_to_send > 0,
            "Pong amount is zero, cannot claim."
        );

        // Clear the last pinger information to prevent multiple claims for the same ping.
        // State updates happen before any potential external calls to prevent reentrancy issues.
        self.last_pinger().set(ManagedAddress::zero());
        self.last_ping_amount().set(BigUint::zero());

        // Send the pong amount to the caller.
        self.send().direct_egld(&caller, &pong_amount_to_send);

        // Emit an event for the successful pong claim.
        self.emit_pong_claimed_event(caller, pong_amount_to_send, current_timestamp);
    }

    /// Allows the contract owner to withdraw all EGLD held by the contract.
    ///
    /// This function is typically used for maintenance or to sweep funds.
    #[only_owner]
    #[endpoint]
    fn withdraw_all_egld(&self) {
        let owner_address = self.owner().get();
        let contract_balance = self.blockchain().get_balance(self.blockchain().get_sc_address());
        let current_timestamp = self.blockchain().get_block_timestamp();

        // Ensure there is EGLD to withdraw.
        require!(
            contract_balance > 0,
            "Contract balance is zero, nothing to withdraw"
        );

        // Send all EGLD to the owner.
        // State updates are not strictly necessary here as all funds are withdrawn,
        // but for complex scenarios, state should be updated before transfers.
        self.send().direct_egld(&owner_address, &contract_balance);

        // Emit an event for the withdrawal.
        self.emit_withdraw_event(owner_address, contract_balance, current_timestamp);
    }

    // --- View Functions ---

    /// Returns the address of the contract owner.
    #[view(getOwner)]
    fn get_owner(&self) -> ManagedAddress {
        self.owner().get()
    }

    /// Returns the address of the last user who called `ping`.
    /// Returns a zero address if no one has pinged yet or if the last pong has been claimed.
    #[view(getLastPinger)]
    fn get_last_pinger(&self) -> ManagedAddress {
        self.last_pinger().get()
    }

    /// Returns the amount of EGLD sent by the `last_pinger`.
    /// Returns zero if no one has pinged yet or if the last pong has been claimed.
    #[view(getLastPingAmount)]
    fn get_last_ping_amount(&self) -> BigUint {
        self.last_ping_amount().get()
    }

    /// Returns the timestamp of the last `ping` operation.
    /// Returns zero if no one has pinged yet.
    #[view(getLastPingTimestamp)]
    fn get_last_ping_timestamp(&self) -> u64 {
        self.last_ping_timestamp().get()
    }

    /// Returns the total number of `ping` operations performed on the contract.
    #[view(getTotalPings)]
    fn get_total_pings(&self) -> u64 {
        self.total_pings().get()
    }

    /// Returns the amount of EGLD that will be sent back as a "pong".
    /// This value is configurable by the contract owner.
    #[view(getPongAmount)]
    fn get_pong_amount(&self) -> BigUint {
        self.pong_amount().get()
    }

    /// Returns the current EGLD balance of the smart contract.
    #[view(getContractBalance)]
    fn get_contract_balance(&self) -> BigUint {
        self.blockchain().get_balance(self.blockchain().get_sc_address())
    }

    // --- Storage Mappers ---

    /// Stores the address of the contract owner.
    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<Self::Api, ManagedAddress>;

    /// Stores the address of the last user who successfully called the `ping` endpoint.
    /// A zero address indicates no pending pong.
    #[storage_mapper("last_pinger")]
    fn last_pinger(&self) -> SingleValueMapper<Self::Api, ManagedAddress>;

    /// Stores the amount of EGLD sent by the `last_pinger`.
    /// This is reset to zero after a pong is claimed.
    #[storage_mapper("last_ping_amount")]
    fn last_ping_amount(&self) -> SingleValueMapper<Self::Api, BigUint>;

    /// Stores the timestamp when the last `ping` operation occurred.
    #[storage_mapper("last_ping_timestamp")]
    fn last_ping_timestamp(&self) -> SingleValueMapper<Self::Api, u64>;

    /// Stores the total count of `ping` operations since contract deployment.
    #[storage_mapper("total_pings")]
    fn total_pings(&self) -> SingleValueMapper<Self::Api, u64>;

    /// Stores the configurable amount of EGLD to be returned as a "pong".
    #[storage_mapper("pong_amount")]
    fn pong_amount(&self) -> SingleValueMapper<Self::Api, BigUint>;

    // --- Events ---

    /// Emits an event when a user successfully "pings" the contract.
    #[event("ping_event")]
    fn emit_ping_event(
        &self,
        #[indexed] pinger: ManagedAddress, // The address of the pinger. This field is indexed.
        #[indexed] amount: BigUint, // The amount of EGLD sent in the ping. This field is indexed.
        timestamp: u64, // The timestamp of the ping. This is the single non-indexed field.
    );

    /// Emits an event when the contract owner updates the `pong_amount`.
    #[event("set_pong_amount_event")]
    fn emit_set_pong_amount_event(
        &self,
        #[indexed] new_amount: BigUint, // The new pong amount. This field is indexed.
        #[indexed] caller: ManagedAddress, // The address of the caller (owner). This field is indexed.
        timestamp: u64, // The timestamp of the update. This is the single non-indexed field.
    );

    /// Emits an event when a user successfully claims their "pong".
    #[event("pong_claimed_event")]
    fn emit_pong_claimed_event(
        &self,
        #[indexed] claimer: ManagedAddress, // The address of the user who claimed the pong. This field is indexed.
        #[indexed] amount: BigUint, // The amount of EGLD received as pong. This field is indexed.
        timestamp: u64, // The timestamp of the claim. This is the single non-indexed field.
    );

    /// Emits an event when the contract owner withdraws EGLD from the contract.
    #[event("withdraw_event")]
    fn emit_withdraw_event(
        &self,
        #[indexed] owner: ManagedAddress, // The address of the owner who initiated the withdrawal. This field is indexed.
        #[indexed] amount: BigUint, // The amount of EGLD withdrawn. This field is indexed.
        timestamp: u64, // The timestamp of the withdrawal. This is the single non-indexed field.
    );
}

// No custom