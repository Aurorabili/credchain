import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const attestationTypes = {
    CredentialAttestation: [
        { name: "tokenId", type: "uint256" },
        { name: "credentialId", type: "string" },
        { name: "manifestHash", type: "bytes32" },
        { name: "signerRole", type: "uint8" },
        { name: "institutionAuthTokenId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" }
    ]
};

async function deployFixture() {
    const [gov, institutionWallet, holder, outsider] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory("IssuerRegistry");
    const registry = await registryFactory.deploy(gov.address);
    await registry.waitForDeployment();

    const credentialFactory = await ethers.getContractFactory("CredentialSBT");
    const credential = await credentialFactory.deploy(await registry.getAddress());
    await credential.waitForDeployment();

    return { gov, institutionWallet, holder, outsider, registry, credential };
}

async function signAttestation(
    signer: Awaited<ReturnType<typeof ethers.getSigners>>[number],
    credential: Awaited<ReturnType<typeof deployFixture>>["credential"],
    payload: {
        tokenId: bigint | number;
        credentialId: string;
        manifestHash: string;
        signerRole: number;
        institutionAuthTokenId: bigint | number;
        nonce: bigint | number;
        deadline: number;
    }
) {
    const network = await ethers.provider.getNetwork();
    const domain = {
        name: "CredChain Credential Attestation",
        version: "1",
        chainId: Number(network.chainId),
        verifyingContract: await credential.getAddress()
    };

    return signer.signTypedData(domain, attestationTypes, payload);
}

describe("CredentialSBT", function () {
    it("supports browse page queries for owner lists, credential lookup and actor roles", async function () {
        const { gov, institutionWallet, holder, credential, registry } = await deployFixture();

        await (await credential.connect(holder).selfIssueCredential("cred-list-1", "manifest-list-1", ethers.id("manifest-list-1"), 1, 0, 0)).wait();
        await (await credential.connect(gov).selfIssueCredential("cred-list-2", "manifest-list-2", ethers.id("manifest-list-2"), 2, 0, 0)).wait();
        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-list", "manifest-inst-list", ethers.id("manifest-inst-list"), 1, 0)
        ).wait();

        const holderTokens = await credential.tokensOfOwner(holder.address);
        const govTokens = await credential.tokensOfOwner(gov.address);
        const institutionTokens = await credential.tokensOfOwner(institutionWallet.address);

        expect(holderTokens.map(Number)).to.deep.equal([1]);
        expect(govTokens.map(Number)).to.deep.equal([2]);
        expect(institutionTokens.map(Number)).to.deep.equal([3]);

        expect(await credential.tokenIdOfCredential("cred-list-1")).to.equal(1n);
        expect(await credential.tokenIdOfCredential("missing-credential")).to.equal(0n);
        expect(await credential.latestTokenId()).to.equal(3n);

        expect(await registry.isGov(gov.address)).to.equal(true);
        expect(await credential.hasActiveInstitutionAuth(institutionWallet.address)).to.equal(true);
        expect((await credential.activeInstitutionAuthTokensOf(institutionWallet.address)).map(Number)).to.deep.equal([3]);
    });

    it("keeps a standard self-issued credential as self-signed for a normal holder", async function () {
        const { holder, credential } = await deployFixture();

        await (await credential.connect(holder).selfIssueCredential("cred-001", "manifest-001", ethers.id("manifest-001"), 2, 0, 0)).wait();

        const verify = await credential.verifyByCredentialId("cred-001");
        const tokenId = await credential.tokenIdOfCredential("cred-001");

        expect(verify.exists).to.equal(true);
        expect(verify.credentialType).to.equal(0);
        expect(verify.trustStatus).to.equal(0);
        expect(verify.trusted).to.equal(false);
        expect(verify.signerCount).to.equal(1);
        expect(await credential.hasSigned(tokenId, holder.address)).to.equal(true);
        expect(await credential.hasActiveInstitutionAuth(holder.address)).to.equal(false);
    });

    it("returns a non-existent verify result for missing tokens and blocks invalid metadata reads", async function () {
        const { credential } = await deployFixture();

        const verify = await credential.verifyByTokenId(999);
        expect(verify.exists).to.equal(false);
        expect(verify.holder).to.equal(ethers.ZeroAddress);
        expect(verify.signerCount).to.equal(0);

        await expect(credential.credentialMeta(999)).to.be.revertedWith("invalid tokenId");
        await expect(credential.hasSigned(999, ethers.ZeroAddress)).to.be.revertedWith("invalid tokenId");
    });

    it("marks a governance self-issued standard credential as trusted and keeps direct attestation unavailable", async function () {
        const { gov, credential } = await deployFixture();

        await (await credential.connect(gov).selfIssueCredential("cred-gov", "manifest-gov", ethers.id("manifest-gov"), 1, 0, 0)).wait();

        const tokenId = await credential.tokenIdOfCredential("cred-gov");
        const verify = await credential.verifyByTokenId(tokenId);

        expect(verify.trusted).to.equal(true);
        expect(verify.trustStatus).to.equal(1);
        expect(verify.governanceSignerCount).to.equal(1);
        expect(await credential.hasSigned(tokenId, gov.address)).to.equal(true);
    });

    it("only governance can issue institution auth SBT and the holder can self-issue standard credentials as institution", async function () {
        const { gov, institutionWallet, holder, credential } = await deployFixture();

        await expect(
            credential
                .connect(holder)
                .issueInstitutionAuthCredential(holder.address, "inst-auth-bad", "manifest-bad", ethers.id("bad"), 1, 0)
        ).to.be.revertedWith("gov only");

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-001", "manifest-inst-001", ethers.id("manifest-inst-001"), 1, 0)
        ).wait();

        const institutionAuthTokenId = await credential.tokenIdOfCredential("inst-auth-001");
        const institutionVerify = await credential.verifyByTokenId(institutionAuthTokenId);

        expect(institutionVerify.credentialType).to.equal(1);
        expect(institutionVerify.trusted).to.equal(true);
        expect(await credential.hasActiveInstitutionAuth(institutionWallet.address)).to.equal(true);

        await (await credential
            .connect(institutionWallet)
            .selfIssueCredential("cred-inst-self", "manifest-inst-self", ethers.id("manifest-inst-self"), 3, 0, institutionAuthTokenId)
        ).wait();

        const trustedTokenId = await credential.tokenIdOfCredential("cred-inst-self");
        const trustedVerify = await credential.verifyByTokenId(trustedTokenId);

        expect(trustedVerify.trusted).to.equal(true);
        expect(trustedVerify.institutionSignerCount).to.equal(1);
        expect(await credential.hasSigned(trustedTokenId, institutionWallet.address)).to.equal(true);
    });

    it("emits issue events that let the frontend rebuild the primary signer history", async function () {
        const { gov, institutionWallet, holder, credential } = await deployFixture();

        const firstIssueTx = await credential.connect(holder).selfIssueCredential("cred-event-holder", "manifest-event-holder", ethers.id("manifest-event-holder"), 1, 0, 0);
        const firstIssueReceipt = await firstIssueTx.wait();
        const firstIssueLog = firstIssueReceipt!.logs
            .map((log) => {
                try {
                    return credential.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find((parsed) => parsed?.name === "CredentialIssued");

        expect(firstIssueLog?.args.tokenId).to.equal(1n);
        expect(firstIssueLog?.args.holder).to.equal(holder.address);
        expect(firstIssueLog?.args.primarySigner).to.equal(holder.address);
        expect(firstIssueLog?.args.primarySignerRole).to.equal(0n);
        expect(firstIssueLog?.args.primaryInstitutionAuthTokenId).to.equal(0n);

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-event", "manifest-inst-event", ethers.id("manifest-inst-event"), 1, 0)
        ).wait();

        const secondIssueTx = await credential.connect(institutionWallet).selfIssueCredential("cred-event-inst", "manifest-event-inst", ethers.id("manifest-event-inst"), 2, 0, 2);
        const secondIssueReceipt = await secondIssueTx.wait();
        const secondIssueLog = secondIssueReceipt!.logs
            .map((log) => {
                try {
                    return credential.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find((parsed) => parsed?.name === "CredentialIssued");

        expect(secondIssueLog?.args.tokenId).to.equal(3n);
        expect(secondIssueLog?.args.holder).to.equal(institutionWallet.address);
        expect(secondIssueLog?.args.primarySigner).to.equal(institutionWallet.address);
        expect(secondIssueLog?.args.primarySignerRole).to.equal(1n);
        expect(secondIssueLog?.args.primaryInstitutionAuthTokenId).to.equal(2n);
    });

    it("allows institution auth holders to attest a standard credential with EIP-712 signatures", async function () {
        const { gov, institutionWallet, holder, outsider, credential } = await deployFixture();

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-002", "manifest-inst-002", ethers.id("manifest-inst-002"), 1, 0)
        ).wait();
        const institutionAuthTokenId = await credential.tokenIdOfCredential("inst-auth-002");

        await (await credential.connect(holder).selfIssueCredential("cred-002", "manifest-002", ethers.id("manifest-002"), 2, 0, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-002");

        const latestBlock = await ethers.provider.getBlock("latest");
        const payload = {
            tokenId,
            credentialId: "cred-002",
            manifestHash: ethers.id("manifest-002"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 1,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const signature = await signAttestation(institutionWallet, credential, payload);
        const digest = await credential.hashCredentialAttestation(payload);

        const tx = await credential.connect(outsider).attestBySig(payload, signature);
        const receipt = await tx.wait();

        const attestedLog = receipt!.logs.find((log) => {
            try {
                const parsed = credential.interface.parseLog(log);
                return parsed?.name === "CredentialAttestedBySig";
            } catch {
                return false;
            }
        });

        expect(attestedLog).to.not.equal(undefined);

        const verify = await credential.verifyByTokenId(tokenId);

        expect(verify.trusted).to.equal(true);
        expect(verify.signerCount).to.equal(2);
        expect(verify.institutionSignerCount).to.equal(1);
        expect(await credential.hasSigned(tokenId, institutionWallet.address)).to.equal(true);
        expect(await credential.isAttestationUsed(digest)).to.equal(true);

        await expect(
            credential.connect(holder).attestBySig(payload, signature)
        ).to.be.revertedWith("digest already used");
    });

    it("allows governance signatures to move a self-signed credential into trusted status", async function () {
        const { gov, holder, outsider, credential } = await deployFixture();

        await (await credential.connect(holder).selfIssueCredential("cred-gov-attest", "manifest-gov-attest", ethers.id("manifest-gov-attest"), 1, 0, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-gov-attest");
        const latestBlock = await ethers.provider.getBlock("latest");
        const payload = {
            tokenId,
            credentialId: "cred-gov-attest",
            manifestHash: ethers.id("manifest-gov-attest"),
            signerRole: 2,
            institutionAuthTokenId: 0,
            nonce: 77,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const signature = await signAttestation(gov, credential, payload);

        await (await credential.connect(outsider).attestBySig(payload, signature)).wait();

        const verify = await credential.verifyByTokenId(tokenId);
        expect(verify.trusted).to.equal(true);
        expect(verify.governanceSignerCount).to.equal(1);
        expect(verify.signerCount).to.equal(2);
    });

    it("rejects repeated or invalid attestation signatures", async function () {
        const { gov, institutionWallet, holder, outsider, credential } = await deployFixture();

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-replay", "manifest-inst-replay", ethers.id("manifest-inst-replay"), 1, 0)
        ).wait();
        const institutionAuthTokenId = await credential.tokenIdOfCredential("inst-auth-replay");

        await (await credential.connect(holder).selfIssueCredential("cred-replay", "manifest-replay", ethers.id("manifest-replay"), 1, 0, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-replay");
        const latestBlock = await ethers.provider.getBlock("latest");

        const payload = {
            tokenId,
            credentialId: "cred-replay",
            manifestHash: ethers.id("manifest-replay"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 9,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const signature = await signAttestation(institutionWallet, credential, payload);

        await (await credential.connect(outsider).attestBySig(payload, signature)).wait();

        const duplicatePayload = {
            ...payload,
            nonce: 10
        };
        const duplicateSignature = await signAttestation(institutionWallet, credential, duplicatePayload);

        await expect(
            credential.connect(outsider).attestBySig(duplicatePayload, duplicateSignature)
        ).to.be.revertedWith("already attested");

        const invalidPayload = {
            ...payload,
            tokenId: tokenId + 1n,
            nonce: 11
        };
        const invalidSignature = await signAttestation(institutionWallet, credential, invalidPayload);

        await expect(
            credential.connect(outsider).attestBySig(invalidPayload, invalidSignature)
        ).to.be.revertedWith("invalid tokenId");
    });

    it("rejects attestation failures that match frontend detail-page edge cases", async function () {
        const { gov, institutionWallet, holder, outsider, credential } = await deployFixture();

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-fail", "manifest-inst-fail", ethers.id("manifest-inst-fail"), 1, 0)
        ).wait();
        const institutionAuthTokenId = await credential.tokenIdOfCredential("inst-auth-fail");

        await (await credential.connect(holder).selfIssueCredential("cred-fail", "manifest-fail", ethers.id("manifest-fail"), 1, 0, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-fail");
        const latestBlock = await ethers.provider.getBlock("latest");

        const mismatchedCredentialPayload = {
            tokenId,
            credentialId: "wrong-id",
            manifestHash: ethers.id("manifest-fail"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 21,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const mismatchedCredentialSig = await signAttestation(institutionWallet, credential, mismatchedCredentialPayload);
        await expect(
            credential.connect(outsider).attestBySig(mismatchedCredentialPayload, mismatchedCredentialSig)
        ).to.be.revertedWith("credential mismatch");

        const mismatchedManifestPayload = {
            tokenId,
            credentialId: "cred-fail",
            manifestHash: ethers.id("different-manifest"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 22,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const mismatchedManifestSig = await signAttestation(institutionWallet, credential, mismatchedManifestPayload);
        await expect(
            credential.connect(outsider).attestBySig(mismatchedManifestPayload, mismatchedManifestSig)
        ).to.be.revertedWith("manifest mismatch");

        const wrongRolePayload = {
            tokenId,
            credentialId: "cred-fail",
            manifestHash: ethers.id("manifest-fail"),
            signerRole: 2,
            institutionAuthTokenId,
            nonce: 23,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const wrongRoleSig = await signAttestation(institutionWallet, credential, wrongRolePayload);
        await expect(
            credential.connect(outsider).attestBySig(wrongRolePayload, wrongRoleSig)
        ).to.be.revertedWith("governance required");

        const expiredAttestationPayload = {
            tokenId,
            credentialId: "cred-fail",
            manifestHash: ethers.id("manifest-fail"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 24,
            deadline: Number(latestBlock!.timestamp) - 1
        };
        const expiredAttestationSig = await signAttestation(institutionWallet, credential, expiredAttestationPayload);
        await expect(
            credential.connect(outsider).attestBySig(expiredAttestationPayload, expiredAttestationSig)
        ).to.be.revertedWith("attestation expired");

        const authToken = await credential.tokenIdOfCredential("inst-auth-fail");
        const authPayload = {
            tokenId: authToken,
            credentialId: "inst-auth-fail",
            manifestHash: ethers.id("manifest-inst-fail"),
            signerRole: 2,
            institutionAuthTokenId: 0,
            nonce: 25,
            deadline: Number(latestBlock!.timestamp) + 3600
        };
        const authSig = await signAttestation(gov, credential, authPayload);
        await expect(
            credential.connect(outsider).attestBySig(authPayload, authSig)
        ).to.be.revertedWith("auth token cannot attest");
    });

    it("prevents expired institution auth SBT from being used for attestation", async function () {
        const { gov, institutionWallet, holder, outsider, credential } = await deployFixture();

        const latestBlock = await ethers.provider.getBlock("latest");
        const expiresAt = Number(latestBlock!.timestamp) + 5;

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-exp", "manifest-inst-exp", ethers.id("manifest-inst-exp"), 1, expiresAt)
        ).wait();

        const institutionAuthTokenId = await credential.tokenIdOfCredential("inst-auth-exp");

        await (await credential.connect(holder).selfIssueCredential("cred-exp", "manifest-exp", ethers.id("manifest-exp"), 1, 0, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-exp");

        await ethers.provider.send("evm_increaseTime", [10]);
        await ethers.provider.send("evm_mine", []);

        const currentBlock = await ethers.provider.getBlock("latest");
        const payload = {
            tokenId,
            credentialId: "cred-exp",
            manifestHash: ethers.id("manifest-exp"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 12,
            deadline: Number(currentBlock!.timestamp) + 3600
        };
        const signature = await signAttestation(institutionWallet, credential, payload);

        await expect(
            credential.connect(outsider).attestBySig(payload, signature)
        ).to.be.revertedWith("invalid institution auth");
    });

    it("marks expired standard credentials as expired and blocks new attestations", async function () {
        const { gov, holder, outsider, credential } = await deployFixture();

        const latestBlock = await ethers.provider.getBlock("latest");
        const expiresAt = Number(latestBlock!.timestamp) + 5;
        await (await credential.connect(holder).selfIssueCredential("cred-expired-standard", "manifest-expired-standard", ethers.id("manifest-expired-standard"), 1, expiresAt, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-expired-standard");

        await ethers.provider.send("evm_increaseTime", [10]);
        await ethers.provider.send("evm_mine", []);

        const verify = await credential.verifyByTokenId(tokenId);
        expect(verify.expired).to.equal(true);
        expect(verify.trusted).to.equal(false);

        const currentBlock = await ethers.provider.getBlock("latest");
        const payload = {
            tokenId,
            credentialId: "cred-expired-standard",
            manifestHash: ethers.id("manifest-expired-standard"),
            signerRole: 2,
            institutionAuthTokenId: 0,
            nonce: 26,
            deadline: Number(currentBlock!.timestamp) + 3600
        };
        const signature = await signAttestation(gov, credential, payload);

        await expect(
            credential.connect(outsider).attestBySig(payload, signature)
        ).to.be.revertedWith("credential expired");
    });

    it("keeps revoke authorization for owner, governance and institution holders", async function () {
        const { gov, institutionWallet, holder, outsider, credential } = await deployFixture();

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-rv", "manifest-inst-rv", ethers.id("manifest-inst-rv"), 1, 0)
        ).wait();

        await (await credential.connect(holder).selfIssueCredential("cred-rv", "manifest-rv", ethers.id("manifest-rv"), 1, 0, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-rv");

        await expect(
            credential.connect(outsider).revokeCredential(tokenId, "nope")
        ).to.be.revertedWith("not authorized");

        await (await credential.connect(institutionWallet).revokeCredential(tokenId, "institution revoke")).wait();
        const verify = await credential.verifyByTokenId(tokenId);
        expect(verify.revoked).to.equal(true);
    });

    it("blocks duplicate credential ids, invalid mint input and post-revocation attestations", async function () {
        const { gov, institutionWallet, holder, outsider, credential } = await deployFixture();

        await expect(
            credential.connect(holder).selfIssueCredential("", "manifest-empty-id", ethers.id("manifest-empty-id"), 1, 0, 0)
        ).to.be.revertedWith("empty credentialId");
        await expect(
            credential.connect(holder).selfIssueCredential("cred-empty-manifest", "", ethers.id("manifest-empty"), 1, 0, 0)
        ).to.be.revertedWith("empty manifestCid");
        await expect(
            credential.connect(holder).selfIssueCredential("cred-zero-files", "manifest-zero-files", ethers.id("manifest-zero-files"), 0, 0, 0)
        ).to.be.revertedWith("fileCount=0");

        await (await credential.connect(holder).selfIssueCredential("cred-dup", "manifest-dup", ethers.id("manifest-dup"), 1, 0, 0)).wait();
        await expect(
            credential.connect(holder).selfIssueCredential("cred-dup", "manifest-dup-2", ethers.id("manifest-dup-2"), 1, 0, 0)
        ).to.be.revertedWith("credential exists");

        await (await credential
            .connect(gov)
            .issueInstitutionAuthCredential(institutionWallet.address, "inst-auth-post-rv", "manifest-inst-post-rv", ethers.id("manifest-inst-post-rv"), 1, 0)
        ).wait();
        const institutionAuthTokenId = await credential.tokenIdOfCredential("inst-auth-post-rv");
        const tokenId = await credential.tokenIdOfCredential("cred-dup");

        await (await credential.connect(gov).revokeCredential(tokenId, "gov revoke")).wait();
        const currentBlock = await ethers.provider.getBlock("latest");
        const payload = {
            tokenId,
            credentialId: "cred-dup",
            manifestHash: ethers.id("manifest-dup"),
            signerRole: 1,
            institutionAuthTokenId,
            nonce: 27,
            deadline: Number(currentBlock!.timestamp) + 3600
        };
        const signature = await signAttestation(institutionWallet, credential, payload);

        await expect(
            credential.connect(outsider).attestBySig(payload, signature)
        ).to.be.revertedWith("already revoked");
    });
});
