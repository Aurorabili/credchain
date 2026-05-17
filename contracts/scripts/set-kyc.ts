import hre from "hardhat";

const DEFAULT_REPUTATION_CORE_ADDRESS =
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function readVerified(value: string | undefined): boolean {
    if (value == null || value === "" || value === "true" || value === "1") {
        return true;
    }
    if (value === "false" || value === "0") {
        return false;
    }
    throw new Error("KYC_VERIFIED must be true, false, 1, or 0");
}

async function main() {
    const account = process.env.KYC_ACCOUNT;
    const reputationCoreAddress =
        process.env.REPUTATION_CORE_ADDRESS || DEFAULT_REPUTATION_CORE_ADDRESS;
    const verified = readVerified(process.env.KYC_VERIFIED);

    if (!account) {
        throw new Error("Missing KYC_ACCOUNT");
    }
    if (!hre.ethers.isAddress(account)) {
        throw new Error(`Invalid KYC account address: ${account}`);
    }
    if (!hre.ethers.isAddress(reputationCoreAddress)) {
        throw new Error(`Invalid ReputationCore address: ${reputationCoreAddress}`);
    }

    const [admin] = await hre.ethers.getSigners();
    const reputationCore = await hre.ethers.getContractAt(
        "ReputationCore",
        reputationCoreAddress
    );

    console.log("KYC admin:", admin.address);
    console.log("ReputationCore:", reputationCoreAddress);
    console.log("Target account:", account);
    console.log("Verified:", verified);

    const tx = await reputationCore.connect(admin).setKYC(account, verified);
    console.log("Transaction:", tx.hash);
    await tx.wait();

    const current = await reputationCore.isKYCVerified(account);
    console.log("Current KYC status:", current);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
