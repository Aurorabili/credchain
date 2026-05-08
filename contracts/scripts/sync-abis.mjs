import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const files = [
    {
        from: resolve("artifacts/contracts/CredentialSBT.sol/CredentialSBT.json"),
        to: resolve("../apps/web/abis/CredentialSBT.json"),
    },
    {
        from: resolve("artifacts/contracts/ReputationCore.sol/ReputationCore.json"),
        to: resolve("../apps/web/abis/ReputationCore.json"),
    },
];

for (const file of files) {
    mkdirSync(dirname(file.to), { recursive: true });
    cpSync(file.from, file.to);
}

console.log("Synced contract ABIs to apps/web/abis");
