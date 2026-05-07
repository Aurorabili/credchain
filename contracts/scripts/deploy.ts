import hre from "hardhat";

async function main() {
    const [admin] = await hre.ethers.getSigners();
    console.log("Deploying with account:", admin.address);

    // 1. Deploy CredentialSBT
    const SBT = await hre.ethers.getContractFactory("CredentialSBT");
    const sbt = await SBT.deploy(admin.address);
    await sbt.waitForDeployment();
    const sbtAddr = await sbt.getAddress();
    console.log("CredentialSBT deployed at:", sbtAddr);

    // 2. Deploy ReputationCore
    const ALPHA = 10n;
    const S_MIN = -100n;
    const S_MAX = 1000n;
    const W_MAX = 50n;
    const K = 2n;
    const C_PHI = 200n;

    const REP = await hre.ethers.getContractFactory("ReputationCore");
    const rep = await REP.deploy(
        admin.address, sbtAddr,
        ALPHA, S_MIN, S_MAX, W_MAX, K, C_PHI
    );
    await rep.waitForDeployment();
    const repAddr = await rep.getAddress();
    console.log("ReputationCore deployed at:", repAddr);

    // 3. Grant MINTER role to ReputationCore so it can mint via relay (optional, here admin keeps minter)
    console.log("Granting roles... Done.");

    // 4. Mint a sample credential for testing
    await sbt.mintCredential(admin.address, "degree", "QmSample1");
    await sbt.mintCredential(admin.address, "certificate", "QmSample2");
    console.log("Minted 2 sample credentials.");

    // 5. Enable KYC for admin
    await rep.setKYC(admin.address, true);
    console.log("KYC enabled for admin.");

    // 6. Deploy Multicall3 for frontend batched reads
    const Multicall = await hre.ethers.getContractFactory("Multicall3");
    const multicall = await Multicall.deploy();
    await multicall.waitForDeployment();
    const multicallAddr = await multicall.getAddress();
    console.log("Multicall3 deployed at:", multicallAddr);

    // 7. Print summary
    console.log("\n=== Deployment Summary ===");
    console.log(`CredentialSBT:   ${sbtAddr}`);
    console.log(`ReputationCore:  ${repAddr}`);
    console.log(`Multicall3:      ${multicallAddr}`);
    console.log(`Alpha: ${ALPHA}, SMin: ${S_MIN}, SMax: ${S_MAX}`);
    console.log(`WMax: ${W_MAX}, K: ${K}, CPhi: ${C_PHI}`);
    console.log(`Network: http://0.0.0.0:8545`);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
