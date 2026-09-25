param(
    [switch]$PlanOnly
)

$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
Set-Location $repositoryRoot

function Write-Separator {
    Write-Host ("-" * 80) -ForegroundColor Gray
}

function Assert-LastCommandSucceeded {
    param(
        [string]$Description,
        [int]$ExitCode = $LASTEXITCODE
    )

    if ($ExitCode -ne 0) {
        throw "$Description failed with exit code $ExitCode."
    }
}

Write-Separator
Write-Host "   Ultra-Tracker Environment Hydration Pipeline" -ForegroundColor Green
Write-Separator

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required to collect diagnostics before hydration. Install Node.js and rerun this script."
    exit 1
}

$hydrationRunId = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")
$diagnosticScript = Join-Path $repositoryRoot "scripts/collect-dev-diagnostics.mjs"
$initialReportPath = Join-Path $repositoryRoot "reports/hydration/$hydrationRunId-initial.json"
$actionQueuePath = Join-Path $repositoryRoot "reports/hydration/$hydrationRunId-actions.txt"

Write-Host "[*] Collecting diagnostics before making changes..." -ForegroundColor Cyan
& node $diagnosticScript --phase initial --run-id $hydrationRunId
Assert-LastCommandSucceeded "Diagnostic collection"

$requiredFiles = @("package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml")
$missingFiles = $requiredFiles | Where-Object { -not (Test-Path (Join-Path $repositoryRoot $_)) }
if ($missingFiles) {
    Write-Error "Hydration requires these missing files: $($missingFiles -join ', '). See $initialReportPath."
    exit 1
}

$report = Get-Content $initialReportPath -Raw | ConvertFrom-Json
$targetPnpmVersion = ($report.runtime.packageManager -replace '^pnpm@', '')
$targetNodeVersion = $report.runtime.requiredNode.version
$actionQueue = @(Get-Content $actionQueuePath | Where-Object { $_ })

Write-Separator
Write-Host "[*] Planned hydration actions:" -ForegroundColor Cyan
foreach ($action in $report.recommendedActions) {
    Write-Host "    -> $($action.id): $($action.reason)" -ForegroundColor Gray
}
Write-Host "    Report: $initialReportPath" -ForegroundColor Gray

if ($PlanOnly) {
    Write-Host "[*] Plan-only mode selected; no changes were made." -ForegroundColor Green
    exit 0
}

$nvmCommand = Get-Command nvm.exe -ErrorAction SilentlyContinue
$nvmRoot = if ($nvmCommand) { Split-Path $nvmCommand.Source -Parent } else { Join-Path $env:LOCALAPPDATA "Author Software\nvm" }
$nvmExecutable = Join-Path $nvmRoot "nvm.exe"
$pnpmHome = if ($env:PNPM_HOME) { $env:PNPM_HOME } else { Join-Path $env:LOCALAPPDATA "pnpm" }
$pnpmBin = Join-Path $pnpmHome "bin"
$nvmShim = Join-Path $nvmRoot ".shim"
$nvmLegacyShim = Join-Path $nvmRoot ".nodejs"

Write-Separator
Write-Host "[*] Applying queued actions..." -ForegroundColor Cyan

foreach ($action in $actionQueue) {
    Write-Host "    -> $action" -ForegroundColor Gray

    switch ($action) {
        "align-node" {
            if (-not (Test-Path $nvmExecutable)) {
                throw "Node.js $targetNodeVersion is required, but nvm.exe was not found."
            }
            & $nvmExecutable use $targetNodeVersion | Out-Host
            Assert-LastCommandSucceeded "Selecting Node.js $targetNodeVersion"
        }
        "normalize-windows-path" {
            if (-not (Test-Path $nvmShim)) {
                throw "The NVM shim directory was not found at $nvmShim."
            }
            $pathEntries = $env:Path -split ';' | Where-Object {
                $_ -and $_ -ne $nvmLegacyShim -and $_ -ne $nvmShim -and $_ -ne $pnpmBin
            }
            $env:Path = "$pnpmBin;$nvmShim;$nvmRoot;$($pathEntries -join ';')"
        }
        "repair-pnpm" {
            @(
                (Join-Path $pnpmHome "pnpm.exe"),
                (Join-Path $pnpmHome "pn.exe"),
                (Join-Path $pnpmHome ".tools")
            ) | Where-Object { Test-Path $_ } | Remove-Item -Recurse -Force

            $env:PNPM_VERSION = $targetPnpmVersion
            Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
        }
        "align-pnpm" {
            $env:PNPM_VERSION = $targetPnpmVersion
            Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
        }
        "hydrate-dependencies" {
            if (Test-Path (Join-Path $repositoryRoot "node_modules")) {
                Remove-Item -Recurse -Force (Join-Path $repositoryRoot "node_modules")
            }
            & pnpm install --frozen-lockfile --force
            Assert-LastCommandSucceeded "Dependency hydration"
        }
        "verify-dependencies" {
            & pnpm install --frozen-lockfile
            Assert-LastCommandSucceeded "Dependency verification"
        }
        default {
            throw "Unknown hydration action: $action"
        }
    }
}

$currentNodeVersion = (& node --version).Trim().TrimStart('v')
$currentPnpmVersion = (& pnpm --version).Trim()
if ($currentNodeVersion -ne $targetNodeVersion -or $currentPnpmVersion -ne $targetPnpmVersion) {
    throw "Hydration completed with Node.js $currentNodeVersion and pnpm $currentPnpmVersion; expected Node.js $targetNodeVersion and pnpm $targetPnpmVersion."
}

Write-Separator
Write-Host "[+] HYDRATION SUCCESSFUL: Workspace is operational." -ForegroundColor Green
Write-Host "    Initial diagnostics: $initialReportPath" -ForegroundColor Gray
Write-Host "    Execute 'pnpm dev' to launch Ultra-Tracker." -ForegroundColor Gray
Write-Separator