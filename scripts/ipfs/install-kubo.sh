#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBO_VERSION="${KUBO_VERSION:-0.41.0}"
ARCHIVE="kubo_v${KUBO_VERSION}_linux-amd64.tar.gz"
DOWNLOAD_URL="https://dist.ipfs.tech/kubo/v${KUBO_VERSION}/${ARCHIVE}"
TMP_DIR="${ROOT_DIR}/.tmp/kubo-install"
TARGET_DIR="${ROOT_DIR}/.tools/kubo"

mkdir -p "${TMP_DIR}" "${ROOT_DIR}/.tools"
rm -rf "${TMP_DIR:?}/"*

curl -L "${DOWNLOAD_URL}" -o "${TMP_DIR}/${ARCHIVE}"
tar -xzf "${TMP_DIR}/${ARCHIVE}" -C "${TMP_DIR}"

rm -rf "${TARGET_DIR}"
mv "${TMP_DIR}/kubo" "${TARGET_DIR}"

"${TARGET_DIR}/ipfs" --version
