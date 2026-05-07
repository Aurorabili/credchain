export const NETWORK = {
    chainId: 1337,
    name: "hardhat",
    rpcUrl: "http://127.0.0.1:8545",
    multicallAddress: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
} as const;

export const CONTRACTS = {
    credentialSBT: {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        abiName: "CredentialSBT",
    },
    reputationCore: {
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        abiName: "ReputationCore",
    },
} as const;

export const PARAMS = {
    alpha: 10n,
    sMin: -100n,
    sMax: 1000n,
    wMax: 50n,
    k: 2n,
    cPhi: 200n,
} as const;
