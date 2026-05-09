#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IPFS_BIN="${ROOT_DIR}/.tools/kubo/ipfs"
IPFS_PATH="${IPFS_PATH:-${ROOT_DIR}/.data/ipfs}"

if [[ ! -x "${IPFS_BIN}" ]]; then
  echo "Kubo binary not found at ${IPFS_BIN}" >&2
  exit 1
fi

export IPFS_PATH

if [[ ! -d "${IPFS_PATH}" || ! -f "${IPFS_PATH}/config" ]]; then
  mkdir -p "${IPFS_PATH}"
  "${IPFS_BIN}" init
fi

"${IPFS_BIN}" bootstrap rm --all >/dev/null

"${IPFS_BIN}" config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
"${IPFS_BIN}" config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET","POST","PUT","OPTIONS"]'
"${IPFS_BIN}" config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization","Content-Type"]'

"${IPFS_BIN}" config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
"${IPFS_BIN}" config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods '["GET","HEAD","OPTIONS"]'
"${IPFS_BIN}" config --json Gateway.HTTPHeaders.Access-Control-Allow-Headers '["Content-Type"]'

echo "Local Kubo node initialized at ${IPFS_PATH}"
