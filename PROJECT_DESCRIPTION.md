# Solana Escrow dApp

**Deployed Frontend URL:** [EscrowFi DApp](https://escrowfi.vercel.app/)

**Solana Program ID:** `BGewPFMdAV2kwwfhxAbqGq4bohXsiB9LZmSw8R99QmZ8`

## Project Overview

### Description
The Solana Escrow dApp is a decentralized marketplace platform built on Solana that enables peer-to-peer property or asset listings with trustless escrow functionality. Sellers can create listings with a fixed price and description, while buyers can securely purchase items knowing that the transaction is enforced by an on-chain program. The platform eliminates the need for intermediaries by using Solana's native capabilities to handle payments and state management directly on the blockchain.

This dApp demonstrates core Solana concepts including Program Derived Addresses (PDAs), Cross-Program Invocations (CPIs) for SOL transfers, account validation through constraints, and proper error handling for various edge cases.

### Key Features

- **Create Listings:** Sellers can create on-chain listings with a specified price (in lamports/SOL) and description for their property or item.
- **Buy Listings:** Buyers can purchase listed items by transferring the exact listing price to the seller, with the transaction enforced by the smart contract.
- **Cancel Listings:** Sellers can cancel their listings before they are sold, closing the account and reclaiming rent.
- **PDA-Based Account Management:** Each listing is stored in a Program Derived Address (PDA) unique to the seller, ensuring predictable and secure account derivation.
- **Sale Tracking:** The program tracks whether a listing has been sold and records the buyer's public key once purchased.
- **Error Handling:** Comprehensive constraint checks prevent unauthorized actions, double-purchases, and other invalid operations.
  
### How to Use the dApp

1. **Connect Wallet**
   - Visit the frontend at [EscrowFi DApp](https://escrowfi.vercel.app/)
   - Click "Connect Wallet" and approve the connection with Phantom or Solflare wallet
   - Ensure you have SOL in your wallet (for devnet/localnet testing, use `solana airdrop`)

2. **Create a Listing**
   - Navigate to the "Create Listing" section
   - Enter the price in SOL (e.g., 1 SOL = 1,000,000,000 lamports)
   - Provide a description for your item or property
   - Click "Create Listing" and approve the transaction
   - Your listing PDA will be created and stored on-chain

3. **Browse and Buy Listings**
   - View available listings on the marketplace page
   - Select a listing you want to purchase
   - Click "Buy" and approve the transaction
   - The program will transfer the listing price to the seller and mark the listing as sold

4. **Cancel a Listing**
   - Go to "My Listings" to view your active listings
   - Click "Cancel" on any unsold listing
   - Approve the transaction to close the listing account and reclaim rent

## Program Architecture

The Solana Escrow program is structured with modular instructions, clean separation of concerns, and follows Anchor framework best practices. The program uses PDAs for deterministic account derivation, ensuring each seller has a unique listing account that can be verified and accessed without requiring the seller to store or manage account keypairs.

### PDA Usage

Program Derived Addresses (PDAs) are used to create deterministic, program-owned accounts that can be derived from a set of seeds. This eliminates the need for storing account addresses off-chain and provides a secure way to manage ownership and access control.

**PDAs Used:**

- **Listing PDA**
  - **Seeds:** `[b"listing", seller.key().as_ref()]`
  - **Purpose:** Creates a unique listing account for each seller. The PDA ensures that only one listing per seller can exist at these seeds, preventing conflicts. The seller's public key as a seed ensures the listing can always be located given the seller's address.
  - **Benefits:** Deterministic account derivation, built-in ownership validation through seed constraints, and no need for off-chain account storage.

### Program Instructions

The program implements three core instructions that handle the complete lifecycle of an escrow listing:

**Instructions Implemented:**

1. **`create_listing`**
   - **Parameters:** `price: u64`, `description: String`
   - **Description:** Creates a new listing account (PDA) owned by the seller with the specified price and description. Initializes the listing state with `sold = false` and `buyer = None`.
   - **Validation:** Ensures the listing PDA is derived correctly and that the seller is the signer.

2. **`buy_listing`**
   - **Parameters:** None (price read from listing account)
   - **Description:** Allows a buyer to purchase a listing by transferring the exact listing price from the buyer to the seller using a System Program CPI. Marks the listing as sold and records the buyer's public key.
   - **Validation:** Ensures the listing hasn't already been sold, the buyer has sufficient funds, and the transfer succeeds.

3. **`cancel_listing`**
   - **Parameters:** None
   - **Description:** Allows the seller to cancel their listing before it's sold. Closes the listing account using Anchor's `close` constraint, returning rent lamports to the seller.
   - **Validation:** Ensures only the seller can cancel (verified through PDA seeds), and the listing hasn't been sold yet.

### Account Structure

```rust
// Listing Account - Stores all information about a single listing
#[account]
pub struct Listing {
    pub seller: Pubkey,           // The public key of the seller who created the listing
    pub buyer: Option<Pubkey>,    // Optional buyer pubkey, set when listing is purchased
    pub price: u64,               // Price in lamports (1 SOL = 1,000,000,000 lamports)
    pub description: String,      // Human-readable description of the item/property
    pub sold: bool,               // Flag indicating whether the listing has been sold
}
```

**Account Context Structures:**

```rust
// CreateListing - Context for creating a new listing
#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 33 + 8 + (4 + 200) + 1, // Discriminator + Pubkey + Option<Pubkey> + u64 + String + bool
        seeds = [b"listing", seller.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

// BuyListing - Context for purchasing a listing
#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    /// CHECK: Seller account receives payment
    pub seller: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref()],
        bump,
        constraint = !listing.sold @ ErrorCode::AlreadySold
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

// CancelListing - Context for canceling a listing
#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref()],
        bump,
        constraint = listing.seller == seller.key() @ ErrorCode::Unauthorized,
        constraint = !listing.sold @ ErrorCode::AlreadySold,
        close = seller
    )]
    pub listing: Account<'info, Listing>,
}
```

## Testing

### Test Coverage

The test suite comprehensively covers both happy paths (expected successful operations) and unhappy paths (error scenarios) to ensure the program behaves correctly under all conditions.

**Happy Path Tests:**

1. **Create Listing (Happy Path):** 
   - Tests successful creation of a listing with valid price and description
   - Verifies that the listing account is initialized with correct data
   - Confirms that `sold = false` and all fields match the input parameters

2. **Buy Listing (Happy Path):**
   - Tests successful purchase of a listing by a buyer with sufficient funds
   - Verifies that SOL is transferred from buyer to seller correctly
   - Confirms that the listing is marked as `sold = true` and buyer pubkey is recorded

3. **Cancel Listing (Happy Path):**
   - Tests successful cancellation of an unsold listing by the seller
   - Verifies that the listing account is closed and rent is returned to seller
   - Confirms that the account no longer exists after cancellation

**Unhappy Path Tests:**

1. **Buy Listing (Insufficient Lamports):**
   - Attempts to purchase a listing with a buyer who has insufficient funds
   - Verifies that the transaction fails with an appropriate error
   - Ensures the listing state remains unchanged after failed purchase

2. **Cancel Listing (Unauthorized):**
   - Attempts to cancel a listing from an account that is not the seller
   - Verifies that the transaction fails due to PDA seed mismatch or constraint violation
   - Ensures that only the seller can cancel their listing

### Running Tests

```bash
# Run all tests with local validator
anchor test

# Run tests with detailed output
anchor test -- --nocapture

# Build and deploy manually, then run tests
anchor build
anchor deploy
anchor run test
```

**Test Output Example:**
```
  escrow
    ✔ create_listing (happy path) (685ms)
    ✔ buy_listing (unhappy: insufficient lamports) (420ms)
    ✔ buy_listing (happy path) (550ms)
    ✔ cancel_listing (unhappy: not seller) (380ms)
    ✔ cancel_listing (happy path) (340ms)

  5 passing (2s)
```

### Additional Notes for Evaluators!
  
- **PDA Design Choice:** The decision to use `[b"listing", seller.key()]` as PDA seeds means each seller can only have one active listing at a time. This is a simplification for the initial implementation. A production version would include a unique identifier (UUID or counter) to support multiple listings per seller.

- **Transfer Implementation:** The `buy_listing` instruction uses System Program CPI (`system_program::transfer`) for transferring SOL from buyer to seller. This is the recommended approach over manual lamport manipulation, as it properly handles rent-exemption checks and prevents common security issues.

- **Error Handling:** Custom error codes (`AlreadySold`, `Unauthorized`) provide clear feedback when transactions fail due to business logic violations, making debugging easier for both developers and users.

- **Frontend Integration:** The Next.js frontend uses `@solana/wallet-adapter-react` for wallet connectivity and `@coral-xyz/anchor` for program interaction. It provides a user-friendly interface for creating, viewing, and purchasing listings.

- **Security Considerations:** 
  - All mutable accounts are properly marked with `#[account(mut)]`
  - PDA seeds are validated on every instruction to prevent unauthorized access
  - Constraints prevent double-purchasing and unauthorized cancellations
  - The `close` constraint safely closes accounts and returns rent

- **Future Enhancements:**
  - Support multiple listings per seller using UUIDs
  - Add time-based expiration for listings
  - Implement dispute resolution mechanisms
  - Add support for SPL token payments instead of just SOL
  - Create a rating/reputation system for buyers and sellers
