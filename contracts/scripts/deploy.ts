import hre from "hardhat";

const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory("IssuerRegistry");
    const registry = await registryFactory.deploy(deployer.address);
    await registry.waitForDeployment();

    const credentialFactory = await ethers.getContractFactory("CredentialSBT");
    const credential = await credentialFactory.deploy(await registry.getAddress());
    await credential.waitForDeployment();

    console.log("IssuerRegistry:", await registry.getAddress());
    console.log("CredentialSBT:", await credential.getAddress());
    console.log("Governance admin:", deployer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
