param(
  [string]$ProjectPath = "C:\xampp\htdocs\BaseBFS"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'feature/talent-platform'
$ExpectedHead = 'ce194ff60174ace7396ac61fb6149edcaf853da3'
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$UpdateRoot = Join-Path $PackageRoot 'update-files'
$Files = @(
  'api/scripts/test-bbva-collaborator-import-certifications.mjs',
  'api/scripts/test-bbva-collaborator-import-identity.mjs',
  'api/src/lib/bbvaCollaboratorCertificationRepository.ts',
  'api/src/lib/bbvaCollaboratorImportCertificationDomain.ts',
  'api/src/lib/bbvaCollaboratorImportDomain.ts',
  'api/src/lib/bbvaCollaboratorImportIdentity.ts',
  'api/src/lib/bbvaCollaboratorImportService.ts',
  'src/pagesBBVATalent/collaborators/CollaboratorImportPage.tsx',
  'src/pagesBBVATalent/types/collaboratorImport.ts'
)

if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) {
  throw "ProjectPath no existe: $ProjectPath"
}
if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath '.git'))) {
  throw "ProjectPath no parece ser el repositorio Git de BaseBFS: $ProjectPath"
}

$branch = (& git -C $ProjectPath branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw 'No fue posible consultar la rama Git.' }
$head = (& git -C $ProjectPath rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'No fue posible consultar el HEAD Git.' }

if ($branch -ne $ExpectedBranch) {
  throw "Rama incorrecta. Esperada: $ExpectedBranch. Actual: $branch"
}
if ($head -ne $ExpectedHead) {
  throw "HEAD incorrecto. Esperado: $ExpectedHead. Actual: $head. No se aplicó ningún archivo."
}

$statusArgs = @('-C', $ProjectPath, 'status', '--porcelain', '--') + $Files
$targetStatus = @(& git @statusArgs)
if ($LASTEXITCODE -ne 0) { throw 'No fue posible validar el estado de los archivos objetivo.' }
if ($targetStatus.Count -gt 0) {
  throw "Hay cambios locales en archivos que esta actualización necesita modificar. No se sobrescribió nada:`n$($targetStatus -join "`n")"
}

foreach ($relative in $Files) {
  $source = Join-Path $UpdateRoot ($relative -replace '/', '\')
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Falta un archivo en el paquete: $relative"
  }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $env:TEMP "BaseBFS-import-stability-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$createdFiles = New-Object System.Collections.Generic.List[string]

try {
  foreach ($relative in $Files) {
    $nativeRelative = $relative -replace '/', '\'
    $source = Join-Path $UpdateRoot $nativeRelative
    $target = Join-Path $ProjectPath $nativeRelative
    $backup = Join-Path $backupRoot $nativeRelative

    if (Test-Path -LiteralPath $target -PathType Leaf) {
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
      Copy-Item -LiteralPath $target -Destination $backup -Force
    } else {
      $createdFiles.Add($target)
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
  }

  Write-Host "Actualización aplicada correctamente." -ForegroundColor Green
  Write-Host "Branch: $branch"
  Write-Host "HEAD base: $head"
  Write-Host "Backup: $backupRoot"
  Write-Host "No se ejecutó commit ni push."
}
catch {
  Write-Warning "Falló la aplicación. Iniciando rollback..."
  foreach ($relative in $Files) {
    $nativeRelative = $relative -replace '/', '\'
    $backup = Join-Path $backupRoot $nativeRelative
    $target = Join-Path $ProjectPath $nativeRelative
    if (Test-Path -LiteralPath $backup -PathType Leaf) {
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
      Copy-Item -LiteralPath $backup -Destination $target -Force
    }
  }
  foreach ($created in $createdFiles) {
    if (Test-Path -LiteralPath $created -PathType Leaf) {
      Remove-Item -LiteralPath $created -Force
    }
  }
  throw
}
