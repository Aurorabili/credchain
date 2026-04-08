import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("CredentialSBT", function () {
    it("self-issues, gets attested, and remains non-transferable", async function () {
        const [admin, holder, issuer, outsider] = await ethers.getSigners();

        const registryFactory = await ethers.getContractFactory("IssuerRegistry");
        const registry = await registryFactory.deploy(admin.address);
        await registry.waitForDeployment();
        await (await registry.setIssuer(issuer.address, true)).wait();

        const credentialFactory = await ethers.getContractFactory("CredentialSBT");
        const credential = await credentialFactory.deploy(await registry.getAddress());
        await credential.waitForDeployment();

        await (await credential.connect(holder).selfIssueCredential("cred-001", "bafy-manifest-cid", ethers.id("manifest"), 3, 0)).wait();

        const tokenId = await credential.tokenIdOfCredential("cred-001");
        const verifyBefore = await credential.verifyByCredentialId("cred-001");
        const issuersBefore = await credential.credentialIssuers(tokenId);

        expect(tokenId).to.equal(1n);
        expect(verifyBefore.exists).to.equal(true);
        expect(verifyBefore.revoked).to.equal(false);
        expect(verifyBefore.issueStatus).to.equal(0);
        expect(verifyBefore.issuerCount).to.equal(1);
        expect(verifyBefore.fileCount).to.equal(3);
        expect(issuersBefore[0]).to.equal(holder.address);

        await (await credential.connect(issuer).attestCredential(tokenId)).wait();
        const verifyAfterAttest = await credential.verifyByTokenId(tokenId);
        const issuersAfter = await credential.credentialIssuers(tokenId);

        expect(verifyAfterAttest.issueStatus).to.equal(1);
        expect(verifyAfterAttest.issuerCount).to.equal(2);
        expect(issuersAfter).to.deep.equal([holder.address, issuer.address]);

        await (await credential.connect(holder).revokeCredential(tokenId, "holder revoke")).wait();
        const verifyAfter = await credential.verifyByTokenId(tokenId);
        expect(verifyAfter.revoked).to.equal(true);

        await expect(
            credential.connect(outsider).revokeCredential(tokenId, "nope")
        ).to.be.revertedWith("not authorized");

        await expect(
            credential.connect(holder).transferFrom(holder.address, outsider.address, tokenId)
        ).to.be.revertedWith("SBT: non-transferable");
    });

    it("rejects empty file list in self issue", async function () {
        const [admin, holder] = await ethers.getSigners();

        const registryFactory = await ethers.getContractFactory("IssuerRegistry");
        const registry = await registryFactory.deploy(admin.address);
        await registry.waitForDeployment();

        const credentialFactory = await ethers.getContractFactory("CredentialSBT");
        const credential = await credentialFactory.deploy(await registry.getAddress());
        await credential.waitForDeployment();

        await expect(
            credential
                .connect(holder)
                .selfIssueCredential("cred-002", "bafy-manifest-cid", ethers.id("manifest-2"), 0, 0)
        ).to.be.revertedWith("fileCount=0");
    });

    it("only active issuer can attest", async function () {
        const [admin, holder, activeIssuer, inactiveIssuer] = await ethers.getSigners();

        const registryFactory = await ethers.getContractFactory("IssuerRegistry");
        const registry = await registryFactory.deploy(admin.address);
        await registry.waitForDeployment();
        await (await registry.setIssuer(activeIssuer.address, true)).wait();

        const credentialFactory = await ethers.getContractFactory("CredentialSBT");
        const credential = await credentialFactory.deploy(await registry.getAddress());
        await credential.waitForDeployment();

        await (await credential.connect(holder).selfIssueCredential("cred-003", "bafy-manifest-cid-003", ethers.id("manifest-003"), 2, 0)).wait();
        const tokenId = await credential.tokenIdOfCredential("cred-003");

        await expect(credential.connect(inactiveIssuer).attestCredential(tokenId)).to.be.revertedWith("issuer inactive");

        await (await credential.connect(activeIssuer).attestCredential(tokenId)).wait();

        const result = await credential.verifyByCredentialId("cred-003");
        expect(result.exists).to.equal(true);
        expect(result.issueStatus).to.equal(1);
        expect(result.fileCount).to.equal(2);
    });

    it("allows issuer revoke and lists owner tokens", async function () {
        const [admin, holder, issuer] = await ethers.getSigners();

        const registryFactory = await ethers.getContractFactory("IssuerRegistry");
        const registry = await registryFactory.deploy(admin.address);
        await registry.waitForDeployment();
        await (await registry.setIssuer(issuer.address, true)).wait();

        const credentialFactory = await ethers.getContractFactory("CredentialSBT");
        const credential = await credentialFactory.deploy(await registry.getAddress());
        await credential.waitForDeployment();

        await (await credential.connect(holder).selfIssueCredential("cred-004", "manifest-a", ethers.id("m1"), 1, 0)).wait();
        await (await credential.connect(holder).selfIssueCredential("cred-005", "manifest-b", ethers.id("m2"), 1, 0)).wait();

        const tokens = await credential.tokensOfOwner(holder.address);
        expect(tokens.map((v: bigint) => Number(v))).to.deep.equal([1, 2]);

        await (await credential.connect(issuer).revokeCredential(1, "issuer revoke")).wait();
        const verify = await credential.verifyByTokenId(1);
        expect(verify.revoked).to.equal(true);
    });
});
