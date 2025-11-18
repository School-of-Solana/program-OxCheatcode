use anchor_lang::prelude::*;

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub buyer: Option<Pubkey>, // Track buyer
    pub price: u64,
    pub description: String,
    pub sold: bool,
}
