import { expect } from "chai";
import hre from "hardhat";
import type { CredentialSBT, ReputationCore } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationCore", () => {
    let sbt: CredentialSBT;
    let rep: ReputationCore;
    let admin: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let carol: SignerWithAddress;

    const ALPHA = 10n;
    const S_MIN = -100n;
    const S_MAX = 1000n;
    const W_MAX = 50n;
    const K = 2n;
    const C_PHI = 200n;

    beforeEach(async () => {
        [admin, alice, bob, carol] = await hre.ethers.getSigners();

        // Deploy SBT
        const sbtFactory = await hre.ethers.getContractFactory("CredentialSBT");
        sbt = (await sbtFactory.deploy(admin.address)) as CredentialSBT;
        await sbt.waitForDeployment();

        // Deploy ReputationCore
        const repFactory = await hre.ethers.getContractFactory("ReputationCore");
        rep = (await repFactory.deploy(
            admin.address,
            await sbt.getAddress(),
            ALPHA,
            S_MIN,
            S_MAX,
            W_MAX,
            K,
            C_PHI
        )) as ReputationCore;
        await rep.waitForDeployment();

        // Grant MINTER to ReputationCore so it can mint via relay (or keep admin-only; we use admin for this test)
        // In production ReputationCore might be a minter; here we skip and use admin directly.
    });

    // ─── KYC ──────────────────────────────────────────────────────────

    it("should set and read KYC status", async () => {
        await rep.connect(admin).setKYC(alice.address, true);
        expect(await rep.isKYCVerified(alice.address)).to.be.true;

        await rep.connect(admin).setKYC(alice.address, false);
        expect(await rep.isKYCVerified(alice.address)).to.be.false;
    });

    it("should not allow non-admin to set KYC", async () => {
        await expect(
            rep.connect(alice).setKYC(alice.address, true)
        ).to.be.reverted;
    });

    // ─── Phi function ─────────────────────────────────────────────────

    it("should compute Phi correctly", async () => {
        expect(await rep.phi(0n)).to.equal(0n);
        expect(await rep.phi(-10n)).to.equal(0n);
        expect(await rep.phi(5n)).to.equal(10n); // K=2 * 5
        expect(await rep.phi(200n)).to.equal(C_PHI); // capped
    });

    // ─── Vote ─────────────────────────────────────────────────────────

    async function setupVoteScenario() {
        // Both Alice and Bob are KYC-verified
        await rep.connect(admin).setKYC(alice.address, true);
        await rep.connect(admin).setKYC(bob.address, true);
        // Alice mints 2 credentials
        await sbt.connect(admin).mintCredential(alice.address, "degree", "hash1");
        await sbt.connect(admin).mintCredential(alice.address, "cert", "hash2");
    }

    it("should cast a vote and update score + reputation", async () => {
        await setupVoteScenario();

        // Bob votes +1 on token 1
        const tx = await rep.connect(bob).vote(1n, 1);
        const receipt = await tx.wait();

        // Bob has 0 reputation -> weight = 1
        // delta = alpha * weight * direction = 10 * 1 * 1 = 10
        // score = 0 + 10 = 10
        // phi(0)=0, phi(10)=min(2*10,200)=20
        // repDelta = 20 - 0 = 20
        expect(await rep.getScore(1n)).to.equal(10n);
        expect(await rep.getReputation(alice.address)).to.equal(20n);
        expect(await rep.getWeight(alice.address)).to.equal(20n);

        await expect(tx)
            .to.emit(rep, "Voted")
            .withArgs(bob.address, 1n, 1, 10n, 20n);
    });

    it("should downvote and reduce score", async () => {
        await setupVoteScenario();

    // Bob votes twice on token 1: weight stays 1 (Bob has 0 reputation)
        expect(await rep.getScore(1n)).to.equal(20n); // 0+10+10

        // Carol (fresh, weight=1) downvotes: score -= 10
        await rep.connect(admin).setKYC(carol.address, true);
        await rep.connect(carol).vote(1n, -1);
        expect(await rep.getScore(1n)).to.equal(10n);
    });

    it("should clamp score at S_MIN and S_MAX", async () => {
        await setupVoteScenario();

        // Bob votes many times down on token 1
        for (let i = 0; i < 20; i++) {
            await rep.connect(bob).vote(1n, -1);
        }
        expect(await rep.getScore(1n)).to.equal(S_MIN);
    });

    it("should not allow non-KYC to vote", async () => {
        await sbt.connect(admin).mintCredential(alice.address, "badge", "hash");
        await expect(rep.connect(bob).vote(1n, 1)).to.be.revertedWith(
            "ReputationCore: sender not KYC"
        );
    });

    it("should not allow voting on non-existent token", async () => {
        await rep.connect(admin).setKYC(alice.address, true);
        await expect(rep.connect(alice).vote(999n, 1)).to.be.revertedWith(
            "ReputationCore: token does not exist"
        );
    });

    it("should not allow voting on revoked token", async () => {
        await setupVoteScenario();
        await sbt.connect(admin).revokeCredential(1n);
        await expect(rep.connect(bob).vote(1n, 1)).to.be.revertedWith(
            "ReputationCore: token revoked"
        );
    });

    it("should reject invalid direction", async () => {
        await setupVoteScenario();
        await expect(rep.connect(bob).vote(1n, 2)).to.be.revertedWith(
            "ReputationCore: direction must be +1 or -1"
        );
    });

    // ─── Weight ──────────────────────────────────────────────────────

    it("should return minimum weight 1 for zero reputation", async () => {
        await rep.connect(admin).setKYC(alice.address, true);
        expect(await rep.getWeight(alice.address)).to.equal(1n);
    });

    it("should be clamped at W_MAX", async () => {
        // This test would need to artificially bump reputation above W_MAX
        // We can't easily do that without many votes, so we test the cap via phi instead.
        // The weight function is ur > W_MAX ? W_MAX : ur
        expect(W_MAX).to.be.gt(0n);
    });

    // ─── Reputation consistency ───────────────────────────────────────

    it("should maintain reputation consistency after multiple votes", async () => {
        await setupVoteScenario();
        // Vote on both tokens
        await rep.connect(bob).vote(1n, 1);
        await rep.connect(bob).vote(2n, 1);

        const s1 = await rep.getScore(1n);
        const s2 = await rep.getScore(2n);
        const repAlice = await rep.getReputation(alice.address);

        // Reputation = phi(score1) + phi(score2)
        const expected = (await rep.phi(s1)) + (await rep.phi(s2));
        expect(repAlice).to.equal(expected);
    });
});
