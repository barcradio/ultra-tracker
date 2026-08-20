# Windows PowerShell Hydration Script
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " STARTING ELECTRON WORKSPACE SECURE HYDRATION     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Step 1: Enforce session-level script isolation shield
Write-Host "`n[1/5] Enforcing terminal security shield..." -ForegroundColor Yellow
$env:npm_config_ignore_scripts = "true"

# Validate .npmrc baseline configuration properties
if (Test-Path .npmrc) {
    $npmrc = Get-Content .npmrc -Raw
    if ($npmrc -notmatch 'ignore-scripts=true') {
        Write-Error "SECURITY CRITICAL: ignore-scripts=true must be defined in your .npmrc file before continuing."
    }
} else {
    Write-Error ".npmrc file is missing from the project root directory."
}

# Step 2: Clear outdated lockfile metrics and run clean installation
Write-Host "`n[2/5] Purging old caches and running secure installation..." -ForegroundColor Yellow
if (Test-Path .\node_modules) { 
    Remove-Item -Recurse -Force .\node_modules 
}
pnpm install

# Step 3: Remediate the outdated browser definitions database
Write-Host "`n[3/5] Updating target browserslist definitions..." -ForegroundColor Yellow
npx update-browserslist-db@latest --yes

# Step 4: Manually extract framework binaries and recompile C++ components
Write-Host "`n[4/5] Executing isolated platform binary extraction and compilation..." -ForegroundColor Yellow
node .\node_modules\electron\install.js
pnpm dlx @electron/rebuild --only better-sqlite3

# Step 5: Tear down temporary script block and boot workspace application frame
Write-Host "`n[5/5] Launching ultra-tracker application environment..." -ForegroundColor Yellow
Remove-Item Env:\npm_config_ignore_scripts -ErrorAction SilentlyContinue
pnpm start
