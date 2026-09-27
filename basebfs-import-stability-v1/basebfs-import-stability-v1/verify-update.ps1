param(
  [string]$ProjectPath = "C:\xampp\htdocs\BaseBFS"
)

$ErrorActionPreference = 'Stop'

Push-Location (Join-Path $ProjectPath 'api')
try {
  npm.cmd run build
  node .\scripts\test-bbva-collaborator-import-certifications.mjs
  node .\scripts\test-bbva-collaborator-import-identity.mjs
}
finally {
  Pop-Location
}

Push-Location $ProjectPath
try {
  node .\scripts\test-bbva-import-parser-guard.cjs
  npm.cmd run build
  git status --short
}
finally {
  Pop-Location
}
