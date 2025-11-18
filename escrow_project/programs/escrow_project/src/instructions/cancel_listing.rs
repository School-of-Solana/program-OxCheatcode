use anchor_lang::prelude::*;
use crate::state::Listing;

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
        close = seller  // This automatically closes the account and sends rent to seller
    )]
    pub listing: Account<'info, Listing>,
}

pub fn handler(_ctx: Context<CancelListing>) -> Result<()> {
    // The `close = seller` constraint handles everything automatically
    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Only the seller can cancel this listing")]
    Unauthorized,
    #[msg("Listing has already been sold")]
    AlreadySold,
}