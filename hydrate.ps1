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

$pythonCandidates = @(
    $env:PYTHON,
    "$env:LocalAppData\Programs\Python\Python313\python.exe",
    "$env:LocalAppData\Programs\Python\Python312\python.exe",
    "$env:ProgramFiles\Python313\python.exe",
    "$env:ProgramFiles\Python312\python.exe"
)
$pythonPath = $pythonCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $pythonPath) {
    Write-Error "Python is required to rebuild better-sqlite3. Install Python 3.13 and rerun this script."
}
$env:PYTHON = $pythonPath
Write-Host "Using Python: $env:PYTHON" -ForegroundColor DarkGray

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
