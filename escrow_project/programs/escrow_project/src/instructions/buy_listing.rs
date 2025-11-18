use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::Listing;

#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    /// CHECK: This is the seller account that will receive payment
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

pub fn handler(ctx: Context<BuyListing>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;

    // Transfer lamports using System Program CPI
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.seller.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, listing.price)?;

    // Mark sold & track buyer
    listing.sold = true;
    listing.buyer = Some(ctx.accounts.buyer.key());

    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("This listing has already been sold")]
    AlreadySold,
}