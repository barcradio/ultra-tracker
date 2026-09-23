# ==============================================================================
# Ultra-Tracker Workspace Hydration Script
# ==============================================================================
$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
Set-Location $repositoryRoot

# Define the visual horizontal separator line
function Write-Separator {
    Write-Host ("-" * 80) -ForegroundColor Gray
}

Write-Separator
Write-Host "   Ultra-Tracker Environment Hydration Pipeline" -ForegroundColor Green
Write-Separator

# ==============================================================================
# PHASE 1: DYNAMIC PNPM ENVIRONMENT INTEGRITY CHECK
# ==============================================================================
Write-Host "[*] Verifying package manager orchestration configuration..." -ForegroundColor Cyan

$packageJsonPath = Join-Path $repositoryRoot "package.json"
$workspacePath = Join-Path $repositoryRoot "pnpm-workspace.yaml"
$lockfilePath = Join-Path $repositoryRoot "pnpm-lock.yaml"
$targetPnpmVersion = "12.3.4" # Secure baseline fallback if dynamic lookup fails
$targetNodeVersion = "22.11.0"

if (-not (Test-Path $packageJsonPath) -or -not (Test-Path $workspacePath) -or -not (Test-Path $lockfilePath)) {
    Write-Error "Hydration must be run from an intact Ultra-Tracker checkout containing package.json, pnpm-workspace.yaml, and pnpm-lock.yaml."
    exit 1
}

try {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    if ($packageJson.packageManager -and $packageJson.packageManager -match "pnpm@(.+)") {
        $targetPnpmVersion = $Matches[1]
        Write-Host "    -> Target version extracted from manifest: pnpm@$targetPnpmVersion" -ForegroundColor Gray
    }
    if ($packageJson.devEngines.runtime.name -eq "node" -and $packageJson.devEngines.runtime.version) {
        $targetNodeVersion = $packageJson.devEngines.runtime.version
        Write-Host "    -> Target version extracted from manifest: node@$targetNodeVersion" -ForegroundColor Gray
    }
} catch {
    Write-Error "Unable to parse package.json. Hydration cannot continue."
    exit 1
}

# 1. Verify if the global command variable path mapping exists
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "`n[!] ERROR: pnpm execution binary is missing from your environment PATH variables." -ForegroundColor Red
    Write-Host "    Please run the official native standalone installer to bootstrap your path configuration." -ForegroundColor Yellow
    exit 1
}

# 2. Query execution engine for version and route standard errors directly into string parsing
Write-Host "[*] Testing execution engine stability..." -ForegroundColor Cyan
$pnpmCheck = & pnpm -v 2>&1 | Out-String

# 3. Intercept the legacy node-wrapped / architecture wrapper loop crash signature
if (($pnpmCheck -match "ERR_PNPM_NO_MATCHING_VERSION") -or ($pnpmCheck -match "@pnpm/win-x64")) {
    Write-Host "`n[!] CRITICAL ERROR DETECTED: Corrupted or legacy Node-wrapped pnpm layout discovered." -ForegroundColor Red
    Write-Host "    Your machine is attempting to pull an obsolete wrapper package (@pnpm/win-x64)." -ForegroundColor Yellow
    Write-Host "    This hard-crashes because the pnpm 12 Rust rewrite discontinued architecture scopes.`n" -ForegroundColor Yellow

    $choice = Read-Host "    Would you like this script to auto-heal your local installation to native standalone v$targetPnpmVersion? (Y/N)"
    if ($choice -eq 'Y' -or $choice -eq 'y') {
        Write-Separator
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            Write-Host "[*] Terminating active Node runtimes to release file handle locks..." -ForegroundColor Cyan
            $nodeProcesses | Stop-Process -Force
        }

        $pnpmHome = Join-Path $env:LOCALAPPDATA "pnpm"
        $corruptedPaths = @(
            (Join-Path $pnpmHome "pnpm.exe"),
            (Join-Path $pnpmHome "pn.exe"),
            (Join-Path $pnpmHome ".tools")
        ) | Where-Object { Test-Path $_ }
        if ($corruptedPaths) {
            Write-Host "[*] Purging corrupted configuration wrappers and internal workspace tool mappings..." -ForegroundColor Cyan
            $corruptedPaths | Remove-Item -Recurse -Force
        }

        if (Get-Command npm -ErrorAction SilentlyContinue) {
            Write-Host "[*] Uninstalling conflict-prone global npm modules if they exist..." -ForegroundColor Cyan
            & npm uninstall -g pnpm 2>&1 | Out-Null
        }

        Write-Host "[*] Provisioning clean native standalone runtime binary track for version $targetPnpmVersion..." -ForegroundColor Cyan
        $env:PNPM_VERSION = $targetPnpmVersion
        Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression

        Write-Separator
        Write-Host "[+] Environment healed successfully!" -ForegroundColor Green
        Write-Host "[!] ACTION REQUIRED: Please RESTART your terminal window and re-execute .\hydrate-dev.ps1" -ForegroundColor Cyan
        Write-Separator
        exit 0
    } else {
        Write-Error "Hydration aborted. You must align your local execution tracks to native standalone v$targetPnpmVersion manually before continuing."
        exit 1
    }
}

# 4. Warn if a version mismatch is verified but running cleanly
$currentVersion = $pnpmCheck.Trim()
if ($currentVersion -ne $targetPnpmVersion) {
    Write-Error "Local pnpm version ($currentVersion) does not match the required version ($targetPnpmVersion)."
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is missing from PATH. Install Node.js v$targetNodeVersion before hydrating."
    exit 1
}

$currentNodeVersion = (& node --version).Trim().TrimStart('v')
if ($currentNodeVersion -ne $targetNodeVersion) {
    Write-Error "Local Node.js version ($currentNodeVersion) does not match the required version ($targetNodeVersion)."
    exit 1
}

Write-Host "    [+] Environment verified healthy (pnpm v$currentVersion, Node.js v$currentNodeVersion)." -ForegroundColor Green

# ==============================================================================
# PHASE 2: REPOSITORY DIRECTORY DEPENDENCY HYDRATION
# ==============================================================================
Write-Separator
Write-Host "[*] Beginning monorepo environment hydration..." -ForegroundColor Cyan

# Clean stale build modules to avoid hard lock or caching issues
if (Test-Path (Join-Path $repositoryRoot "node_modules")) {
    Write-Host "    -> Flushing dirty workspace installations..." -ForegroundColor Gray
    Remove-Item -Recurse -Force (Join-Path $repositoryRoot "node_modules")
}

# Recreate the virtual store without accepting dependency resolution drift.
& pnpm install --frozen-lockfile --force

# Catch downstream native script failures
if ($LASTEXITCODE -ne 0) {
    Write-Separator
    Write-Host "[!] CRITICAL FAILURE: pnpm install exited with code $LASTEXITCODE." -ForegroundColor Red
    Write-Host "    Check the logs above for native module errors (e.g., better-sqlite3)." -ForegroundColor Yellow
    Write-Separator
    exit 1
} else {
    Write-Separator
    Write-Host "[+] HYDRATION SUCCESSFUL: Workspace is operational." -ForegroundColor Green
    Write-Host "    Execute 'pnpm dev' to launch Ultra-Tracker." -ForegroundColor Gray
    Write-Separator
}
