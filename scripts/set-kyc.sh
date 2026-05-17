#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
    cat <<'EOF'
Usage:
  bash scripts/set-kyc.sh <account-address> [true|false]

Environment:
  REPUTATION_CORE_ADDRESS  Optional ReputationCore contract address.

Examples:
  bash scripts/set-kyc.sh 0x1234567890123456789012345678901234567890
  bash scripts/set-kyc.sh 0x1234567890123456789012345678901234567890 false
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
    usage >&2
    exit 1
fi

export KYC_ACCOUNT="$1"
export KYC_VERIFIED="${2:-true}"

pnpm --dir "${ROOT_DIR}/contracts" exec hardhat run \
    "${ROOT_DIR}/contracts/scripts/set-kyc.ts" \
    --network localhost
