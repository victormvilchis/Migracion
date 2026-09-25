# start.ps1 - Levanta el backend (Azure Functions) y frontend (Vite) en Windows PowerShell
$projectRoot = Get-Location

Write-Host "🚀 Iniciando Backend (Azure Functions en http://localhost:7071)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location "$root\api"
    npm start
} -ArgumentList $projectRoot

Write-Host "🚀 Iniciando Frontend (Vite en http://localhost:5173)..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location "$root"
    npm run dev
} -ArgumentList $projectRoot

Write-Host "Servidores en ejecución. Presiona Ctrl+C para detener." -ForegroundColor Yellow

try {
    while ($true) {
        Receive-Job $backendJob | Write-Host
        Receive-Job $frontendJob | Write-Host
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "Deteniendo servidores..." -ForegroundColor Red
    Stop-Job $backendJob, $frontendJob
    Remove-Job $backendJob, $frontendJob
}
