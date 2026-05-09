#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IPFS_BIN="${ROOT_DIR}/.tools/kubo/ipfs"

bash "${ROOT_DIR}/scripts/ipfs/init-local-node.sh"

export IPFS_PATH="${IPFS_PATH:-${ROOT_DIR}/.data/ipfs}"

exec "${IPFS_BIN}" daemon --offline
