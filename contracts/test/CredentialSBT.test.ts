import { expect } from "chai";
import hre from "hardhat";
import type { CredentialSBT, ReputationCore } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CredentialSBT", () => {
    let sbt: CredentialSBT;
    let admin: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;

    beforeEach(async () => {
        [admin, alice, bob] = await hre.ethers.getSigners();
        const factory = await hre.ethers.getContractFactory("CredentialSBT");
        sbt = (await factory.deploy(admin.address)) as CredentialSBT;
        await sbt.waitForDeployment();
    });

    // ─── Mint & Metadata ────────────────────────────────────────────

    it("should mint a credential SBT", async () => {
        const tx = await sbt
            .connect(admin)
            .mintCredential(alice.address, "degree", "QmTest123");
        const receipt = await tx.wait();

        const tokenId = 1n;
        expect(await sbt.ownerOf(tokenId)).to.equal(alice.address);
        expect(await sbt.businessType(tokenId)).to.equal("degree");
        expect(await sbt.metadataCID(tokenId)).to.equal("QmTest123");
        expect(await sbt.exists(tokenId)).to.be.true;
        await expect(tx)
            .to.emit(sbt, "CredentialMinted")
            .withArgs(tokenId, alice.address, "degree", "QmTest123");
        await expect(tx).to.emit(sbt, "Locked").withArgs(tokenId);
    });

    it("should increment token IDs", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "cert", "hash1");
        await sbt.connect(admin).mintCredential(bob.address, "cert", "hash2");
        expect(await sbt.ownerOf(1n)).to.equal(alice.address);
        expect(await sbt.ownerOf(2n)).to.equal(bob.address);
    });

    it("should return tokenURI with ipfs:// prefix", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "badge", "QmHash");
        expect(await sbt.tokenURI(1n)).to.equal("ipfs://QmHash");
    });

    // ─── Revoke ─────────────────────────────────────────────────────

    it("should revoke a credential", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "badge", "hash");
        await sbt.connect(admin).revokeCredential(1n);
        expect(await sbt.isRevoked(1n)).to.be.true;
        await expect(sbt.connect(admin).revokeCredential(1n)).to.be.revertedWith(
            "CredentialSBT: already revoked"
        );
    });

    it("should not allow non-revoker to revoke", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "badge", "hash");
        await expect(sbt.connect(alice).revokeCredential(1n)).to.be.reverted;
    });

    // ─── Soulbound ──────────────────────────────────────────────────

    it("should be locked (ERC5192)", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "badge", "hash");
        expect(await sbt.locked(1n)).to.be.true;
    });

    it("should prevent transfers", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "badge", "hash");
        await expect(
            sbt.connect(alice).transferFrom(alice.address, bob.address, 1n)
        ).to.be.revertedWith("CredentialSBT: token is soulbound");
    });

    // ─── Access Control ─────────────────────────────────────────────

    it("should not allow non-minter to mint", async () => {
        await expect(
            sbt.connect(alice).mintCredential(alice.address, "badge", "hash")
        ).to.be.reverted;
    });

    it("should revert on zero address mint", async () => {
        await expect(
            sbt
                .connect(admin)
                .mintCredential(
                    "0x0000000000000000000000000000000000000000",
                    "badge",
                    "hash"
                )
        ).to.be.revertedWith("CredentialSBT: mint to zero");
    });

    it("should revert on empty credential type", async () => {
        await expect(
            sbt.connect(admin).mintCredential(alice.address, "", "hash")
        ).to.be.revertedWith("CredentialSBT: empty business type");
    });

    it("should revert on empty metadata hash", async () => {
        await expect(
            sbt.connect(admin).mintCredential(alice.address, "badge", "")
        ).to.be.revertedWith("CredentialSBT: empty metadata CID");
    });

    it("should revert tokenURI for non-existent token", async () => {
        await expect(sbt.tokenURI(999n)).to.be.reverted;
    });
});
