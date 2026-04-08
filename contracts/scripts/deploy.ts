import hre from "hardhat";

const { ethers } = hre;

async function main() {
    const [deployer, issuer] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory("IssuerRegistry");
    const registry = await registryFactory.deploy(deployer.address);
    await registry.waitForDeployment();

    const credentialFactory = await ethers.getContractFactory("CredentialSBT");
    const credential = await credentialFactory.deploy(await registry.getAddress());
    await credential.waitForDeployment();

    const deployerIssuerTx = await registry.setIssuer(deployer.address, true);
    await deployerIssuerTx.wait();

    const tx = await registry.setIssuer(issuer.address, true);
    await tx.wait();

    console.log("IssuerRegistry:", await registry.getAddress());
    console.log("CredentialSBT:", await credential.getAddress());
    console.log("Bootstrap issuer:", issuer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
