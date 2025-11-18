use anchor_lang::prelude::*;
use crate::state::Listing;

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 1 + 32 + 8 + 200, // 8 discriminator + Pubkey + Option<Pubkey> + u64 + description
        seeds = [b"listing", seller.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateListing>, price: u64, description: String) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.seller = ctx.accounts.seller.key();
    listing.buyer = None;
    listing.price = price;
    listing.description = description;
    listing.sold = false;
    Ok(())
}
