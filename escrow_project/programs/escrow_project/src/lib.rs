use anchor_lang::prelude::*;
pub mod state;
pub mod instructions;
use instructions::*;
declare_id!("BGewPFMdAV2kwwfhxAbqGq4bohXsiB9LZmSw8R99QmZ8");

#[program]
pub mod escrow_project {
    use super::*;
    
    pub fn create_listing(ctx: Context<CreateListing>, price: u64, description: String) -> Result<()> {
        instructions::create_listing::handler(ctx, price, description)
    }
    
    pub fn buy_listing(ctx: Context<BuyListing>) -> Result<()> {
        instructions::buy_listing::handler(ctx)
    }
    
    // ADD THIS:
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        instructions::cancel_listing::handler(ctx)
    }
}