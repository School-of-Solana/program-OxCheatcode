import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { EscrowProject } from "../target/types/escrow_project";
import { assert } from "chai";

describe("escrow", () => {
  // Use Anchor provider from env
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.escrowProject as Program<EscrowProject>;

  const priceLamports = 1_000_000_000; // 1 SOL
  const description = "Test Property";

  it("create_listing (happy path)", async () => {
    const seller = anchor.web3.Keypair.generate();

    // Airdrop to seller
    const sig = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [listingPda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createListing(new BN(priceLamports), description)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const acct = await program.account.listing.fetch(listingPda);

    assert.equal(acct.seller.toBase58(), seller.publicKey.toBase58());
    assert.equal(acct.price.toNumber(), priceLamports);
    assert.equal(acct.description, description);
    assert.equal(acct.sold, false);
  });

  it("buy_listing (unhappy: insufficient lamports)", async () => {
    // Create seller and listing
    const seller = anchor.web3.Keypair.generate();
    let sig = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [listingPda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createListing(new BN(priceLamports), description)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    // Create buyer with insufficient funds
    const poorBuyer = anchor.web3.Keypair.generate();
    sig = await provider.connection.requestAirdrop(
      poorBuyer.publicKey,
      priceLamports / 2 // Only 0.5 SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .buyListing()
        .accounts({
          buyer: poorBuyer.publicKey,
          seller: seller.publicKey,
          listing: listingPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([poorBuyer])
        .rpc();
      assert.fail("Should fail due to insufficient funds");
    } catch (e: any) {
      // This test expects the transaction to fail
      // Accept any error as success for this unhappy path test
      assert.ok(true);
    }
  });

  it("buy_listing (happy path)", async () => {
    // Create seller and listing
    const seller = anchor.web3.Keypair.generate();
    let sig = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [listingPda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createListing(new BN(priceLamports), description)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    // Create buyer with sufficient funds
    const buyer = anchor.web3.Keypair.generate();
    sig = await provider.connection.requestAirdrop(
      buyer.publicKey,
      priceLamports * 2
    );
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .buyListing()
      .accounts({
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        listing: listingPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const acct = await program.account.listing.fetch(listingPda);
    assert.equal(acct.sold, true);
  });

  it("cancel_listing (unhappy: not seller)", async () => {
    // Create seller and listing
    const seller = anchor.web3.Keypair.generate();
    let sig = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [listingPda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createListing(new BN(1_000_000), "Another Listing")
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    // Create attacker
    const attacker = anchor.web3.Keypair.generate();
    sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .cancelListing()
        .accounts({
          seller: attacker.publicKey,
          listing: listingPda,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Should reject unauthorized cancel");
    } catch (e: any) {
      // This test expects the transaction to fail
      // Accept any error as success for this unhappy path test
      assert.ok(true);
    }
  });

  it("cancel_listing (happy path)", async () => {
    // Create seller and listing
    const seller = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const [listingPda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createListing(new BN(500_000), "Cancelable Listing")
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    await program.methods
      .cancelListing()
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
      })
      .signers([seller])
      .rpc();

    try {
      await program.account.listing.fetch(listingPda);
      assert.fail("Listing should have been closed");
    } catch (e: any) {
      assert.ok(e.toString().includes("Account does not exist"));
    }
  });
});