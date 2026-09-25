#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
required_version="$(tr -d '[:space:]' < "$script_dir/../.nvmrc")"
required_major="${required_version%%.*}"
current_version="$(node --version 2>/dev/null || true)"

if [[ "$current_version" == "v${required_major}."* ]]; then
    exec "$@"
fi

nvm_dir="${NVM_DIR:-"$HOME/.nvm"}"
if [[ ! -s "$nvm_dir/nvm.sh" ]]; then
    echo "[runtime-contract] Node.js $required_major.x is required (baseline: $required_version). Run from a shell with Node $required_version." >&2
    exit 1
fi

unset npm_config_prefix
source "$nvm_dir/nvm.sh"
nvm exec "$required_version" "$@"
