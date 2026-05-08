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
    let dave: SignerWithAddress;
    let voters: SignerWithAddress[];

    const ALPHA = 10n;
    const S_MIN = -100n;
    const S_MAX = 1000n;
    const W_MAX = 50n;
    const K = 2n;
    const C_PHI = 200n;

    beforeEach(async () => {
        [admin, alice, bob, carol, dave, ...voters] = await hre.ethers.getSigners();

        const sbtFactory = await hre.ethers.getContractFactory("CredentialSBT");
        sbt = (await sbtFactory.deploy(admin.address)) as CredentialSBT;
        await sbt.waitForDeployment();

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
    });

    async function mintCredentialForAlice(businessType = "graduation", metadataCID = "hash1") {
        await sbt.connect(admin).mintCredential(alice.address, businessType, metadataCID);
        return 1n;
    }

    async function setKYCFor(...accounts: SignerWithAddress[]) {
        for (const account of accounts) {
            await rep.connect(admin).setKYC(account.address, true);
        }
    }

    async function createKycWalletVoters(count: number) {
        const provider = hre.ethers.provider;
        const created: Array<InstanceType<typeof hre.ethers.Wallet>> = [];

        for (let index = 0; index < count; index += 1) {
            const wallet = hre.ethers.Wallet.createRandom().connect(provider);
            await admin.sendTransaction({
                to: wallet.address,
                value: hre.ethers.parseEther("1"),
            });
            await rep.connect(admin).setKYC(wallet.address, true);
            created.push(wallet);
        }

        return created;
    }

    // ─── KYC ──────────────────────────────────────────────────────────

    it("sets and reads KYC status", async () => {
        await rep.connect(admin).setKYC(alice.address, true);
        expect(await rep.isKYCVerified(alice.address)).to.equal(true);

        await rep.connect(admin).setKYC(alice.address, false);
        expect(await rep.isKYCVerified(alice.address)).to.equal(false);
    });

    it("does not allow non-admin to set KYC", async () => {
        await expect(rep.connect(alice).setKYC(alice.address, true)).to.be.reverted;
    });

    // ─── Phi function ─────────────────────────────────────────────────

    it("computes phi correctly", async () => {
        expect(await rep.phi(0n)).to.equal(0n);
        expect(await rep.phi(-10n)).to.equal(0n);
        expect(await rep.phi(5n)).to.equal(10n);
        expect(await rep.phi(200n)).to.equal(C_PHI);
    });

    // ─── Vote & statistics ────────────────────────────────────────────

    it("casts a vote and updates score, reputation, and voting statistics", async () => {
        const tokenId = await mintCredentialForAlice();
        await setKYCFor(bob);

        const tx = await rep.connect(bob).vote(tokenId, 1);

        await expect(tx)
            .to.emit(rep, "Voted")
            .withArgs(bob.address, tokenId, 1, 10n, 20n);

        expect(await rep.getScore(tokenId)).to.equal(10n);
        expect(await rep.getRawVoteSum(tokenId)).to.equal(10n);
        expect(await rep.getWeightSum(tokenId)).to.equal(1n);
        expect(await rep.getVoteCount(tokenId)).to.equal(1n);
        expect(await rep.hasVoted(tokenId, bob.address)).to.equal(true);
        expect(await rep.getReputation(alice.address)).to.equal(20n);
        expect(await rep.getWeight(alice.address)).to.equal(20n);
    });

    it("tracks mixed votes from distinct KYC voters", async () => {
        const tokenId = await mintCredentialForAlice();
        await setKYCFor(bob, carol, alice);

        await rep.connect(bob).vote(tokenId, 1);
        await rep.connect(carol).vote(tokenId, -1);

        expect(await rep.getScore(tokenId)).to.equal(0n);
        expect(await rep.getRawVoteSum(tokenId)).to.equal(0n);
        expect(await rep.getWeightSum(tokenId)).to.equal(2n);
        expect(await rep.getVoteCount(tokenId)).to.equal(2n);
        expect(await rep.getReputation(alice.address)).to.equal(0n);
    });

    it("uses voter reputation to increase vote weight", async () => {
        const tokenId1 = await mintCredentialForAlice("graduation", "hash1");
        await sbt.connect(admin).mintCredential(bob.address, "training", "hash2");
        const tokenId2 = 2n;

        await setKYCFor(alice, bob, carol);

        await rep.connect(bob).vote(tokenId1, 1);
        expect(await rep.getReputation(alice.address)).to.equal(20n);

        await rep.connect(alice).vote(tokenId2, 1);

        expect(await rep.getScore(tokenId2)).to.equal(200n);
        expect(await rep.getRawVoteSum(tokenId2)).to.equal(200n);
        expect(await rep.getWeightSum(tokenId2)).to.equal(20n);
        expect(await rep.getVoteCount(tokenId2)).to.equal(1n);
        expect(await rep.getReputation(bob.address)).to.equal(200n);
    });

    it("clamps score at S_MAX while preserving raw vote statistics", async () => {
        const tokenId = await mintCredentialForAlice();
        const batch = await createKycWalletVoters(105);

        for (const voter of batch) {
            await rep.connect(voter).vote(tokenId, 1);
        }

        expect(await rep.getScore(tokenId)).to.equal(S_MAX);
        expect(await rep.getRawVoteSum(tokenId)).to.equal(1050n);
        expect(await rep.getWeightSum(tokenId)).to.equal(105n);
        expect(await rep.getVoteCount(tokenId)).to.equal(105n);
        expect(await rep.getReputation(alice.address)).to.equal(C_PHI);
    });

    it("clamps score at S_MIN while preserving raw vote statistics", async () => {
        const tokenId = await mintCredentialForAlice();
        const batch = voters.slice(0, 12);
        await setKYCFor(...batch);

        for (const voter of batch) {
            await rep.connect(voter).vote(tokenId, -1);
        }

        expect(await rep.getScore(tokenId)).to.equal(S_MIN);
        expect(await rep.getRawVoteSum(tokenId)).to.equal(-120n);
        expect(await rep.getWeightSum(tokenId)).to.equal(12n);
        expect(await rep.getVoteCount(tokenId)).to.equal(12n);
        expect(await rep.getReputation(alice.address)).to.equal(0n);
    });

    it("rejects duplicate voting from the same address", async () => {
        const tokenId = await mintCredentialForAlice();
        await setKYCFor(bob);

        await rep.connect(bob).vote(tokenId, 1);

        await expect(rep.connect(bob).vote(tokenId, -1)).to.be.revertedWith(
            "ReputationCore: already voted"
        );
    });

    it("does not allow non-KYC accounts to vote", async () => {
        const tokenId = await mintCredentialForAlice();
        await expect(rep.connect(bob).vote(tokenId, 1)).to.be.revertedWith(
            "ReputationCore: sender not KYC"
        );
    });

    it("does not allow voting on non-existent tokens", async () => {
        await setKYCFor(bob);
        await expect(rep.connect(bob).vote(999n, 1)).to.be.revertedWith(
            "ReputationCore: token does not exist"
        );
    });

    it("does not allow voting on revoked tokens", async () => {
        const tokenId = await mintCredentialForAlice();
        await setKYCFor(bob);
        await sbt.connect(admin).revokeCredential(tokenId);

        await expect(rep.connect(bob).vote(tokenId, 1)).to.be.revertedWith(
            "ReputationCore: token revoked"
        );
    });

    it("does not allow voting for your own credential", async () => {
        const tokenId = await mintCredentialForAlice();
        await setKYCFor(alice);

        await expect(rep.connect(alice).vote(tokenId, 1)).to.be.revertedWith(
            "ReputationCore: cannot vote for own credential"
        );
    });

    it("rejects invalid vote directions", async () => {
        const tokenId = await mintCredentialForAlice();
        await setKYCFor(bob);

        await expect(rep.connect(bob).vote(tokenId, 2)).to.be.revertedWith(
            "ReputationCore: direction must be +1 or -1"
        );
    });

    // ─── Weight ──────────────────────────────────────────────────────

    it("returns minimum weight 1 for zero reputation", async () => {
        expect(await rep.getWeight(alice.address)).to.equal(1n);
    });

    it("clamps voter weight at W_MAX", async () => {
        await mintCredentialForAlice("graduation", "hash1");
        await sbt.connect(admin).mintCredential(alice.address, "training", "hash2");
        await sbt.connect(admin).mintCredential(alice.address, "honor", "hash3");

        await setKYCFor(bob);
        await rep.connect(bob).vote(1n, 1);
        await rep.connect(bob).vote(2n, 1);
        await rep.connect(bob).vote(3n, 1);

        expect(await rep.getReputation(alice.address)).to.equal(60n);
        expect(await rep.getWeight(alice.address)).to.equal(W_MAX);
    });

    // ─── Reputation consistency ───────────────────────────────────────

    it("maintains reputation consistency after multiple votes", async () => {
        await mintCredentialForAlice("graduation", "hash1");
        await sbt.connect(admin).mintCredential(alice.address, "training", "hash2");
        await setKYCFor(bob, carol);

        await rep.connect(bob).vote(1n, 1);
        await rep.connect(carol).vote(2n, 1);

        const s1 = await rep.getScore(1n);
        const s2 = await rep.getScore(2n);
        const repAlice = await rep.getReputation(alice.address);
        const expected = (await rep.phi(s1)) + (await rep.phi(s2));

        expect(repAlice).to.equal(expected);
    });

    it("keeps vote statistics isolated per token", async () => {
        await mintCredentialForAlice("degree", "hash1");
        await sbt.connect(admin).mintCredential(alice.address, "certificate", "hash2");
        await setKYCFor(bob, carol, dave);

        await rep.connect(bob).vote(1n, 1);
        await rep.connect(carol).vote(2n, 1);
        await rep.connect(dave).vote(2n, -1);

        expect(await rep.getVoteCount(1n)).to.equal(1n);
        expect(await rep.getVoteCount(2n)).to.equal(2n);
        expect(await rep.getRawVoteSum(1n)).to.equal(10n);
        expect(await rep.getRawVoteSum(2n)).to.equal(0n);
    });
});
