#!/bin/bash

# start.sh - Levanta el backend (Azure Functions) y el frontend (Vite) en paralelo.
PROJECT_ROOT="$(pwd)"

cleanup() {
    echo ""
    echo "🛑 Deteniendo servidores locales..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "🧹 Verificando y liberando puertos 7071 (backend) y 5173 (frontend)..."
for port in 7071 5173; do
    PID=$(lsof -t -i :$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo "   Liberando puerto $port (PID: $PID)..."
        kill -9 $PID 2>/dev/null
    fi
done

echo "🚀 Iniciando Backend (Azure Functions en http://localhost:7071)..."
cd "$PROJECT_ROOT/api" || exit 1
npm start &
BACKEND_PID=$!

echo "🚀 Iniciando Frontend (Vite en http://localhost:5173)..."
cd "$PROJECT_ROOT" || exit 1
npm run dev &
FRONTEND_PID=$!

wait
