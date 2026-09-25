@echo off
echo ========================================================
echo Iniciando BaseBFS Platform (Backend y Frontend en paralelo)
echo ========================================================

start "BaseBFS API (Port 7071)" cmd /k "cd api && npm start"
start "BaseBFS Frontend (Port 5173)" cmd /k "npm run dev"

echo Servidores iniciados en ventanas separadas.
