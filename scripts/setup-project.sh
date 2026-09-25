#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$root_dir"

echo "🔍 [bfs-setup] Validando contrato de runtime Node.js..."
node api/scripts/assert-node-runtime.cjs

echo "📦 [bfs-setup] Instalando dependencias del Frontend..."
npm install

echo "📦 [bfs-setup] Instalando dependencias del Backend (Azure Functions)..."
(
    cd "$root_dir/api"
    npm install
)

echo "✨ [bfs-setup] Instalación completada con éxito. Ya puedes iniciar con ./start.sh"
