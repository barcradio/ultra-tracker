param(
    [switch]$Deep
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$safeTargets = @(
    "node_modules",
    "dist",
    "out",
    "coverage",
    "reports",
    ".stryker-tmp"
)
$deepTargets = @(
    "Database",
    "opensplittime.env",
    "rfid.env",
    "resources/ost-api-responses",
    "resources/dns-dnf-files",
    "resources/config/mock-event-archive.zip"
)

Write-Host "Cleaning disposable development artifacts..." -ForegroundColor Cyan

foreach ($target in $safeTargets) {
    $path = Join-Path $root $target
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Removed $target"
    }
}

Get-ChildItem -Path $root -Filter "*.log*" -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

if ($Deep) {
    Write-Host "Cleaning local runtime and generated data..." -ForegroundColor Yellow
    foreach ($target in $deepTargets) {
        $path = Join-Path $root $target
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path
            Write-Host "Removed $target"
        }
    }
}

Write-Host "Development cleanup complete." -ForegroundColor Green