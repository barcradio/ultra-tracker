#!/bin/sh
set -eu

REPOSITORY_ROOT=$(CDPATH= cd "$(dirname "$0")" && pwd)
cd "$REPOSITORY_ROOT"

PLAN_ONLY=false
if [ "${1:-}" = "--plan-only" ]; then
    PLAN_ONLY=true
elif [ "$#" -gt 0 ]; then
    echo "Usage: ./hydrate-dev.sh [--plan-only]"
    exit 1
fi

print_separator() {
    echo "--------------------------------------------------------------------------------"
}

print_separator
echo "   Ultra-Tracker Environment Hydration Pipeline (POSIX)"
print_separator

if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js is required to collect diagnostics before hydration. Install Node.js and rerun this script."
    exit 1
fi

HYDRATION_RUN_ID=$(date -u +%Y%m%dT%H%M%SZ)
INITIAL_REPORT_PATH="$REPOSITORY_ROOT/reports/hydration/$HYDRATION_RUN_ID-initial.json"
ACTION_QUEUE_PATH="$REPOSITORY_ROOT/reports/hydration/$HYDRATION_RUN_ID-actions.txt"

echo "[*] Collecting diagnostics before making changes..."
node "$REPOSITORY_ROOT/scripts/collect-dev-diagnostics.mjs" --phase initial --run-id "$HYDRATION_RUN_ID"

MISSING_FILES=""
for REQUIRED_FILE in package.json pnpm-workspace.yaml pnpm-lock.yaml; do
    if [ ! -f "$REQUIRED_FILE" ]; then
        MISSING_FILES="$MISSING_FILES $REQUIRED_FILE"
    fi
done
if [ -n "$MISSING_FILES" ]; then
    echo "[!] Hydration requires these missing files:$MISSING_FILES. See $INITIAL_REPORT_PATH."
    exit 1
fi

TARGET_PNPM_VERSION=$(grep -m 1 '"packageManager":' package.json | sed -E 's/.*pnpm@([^" ]+).*/\1/')
TARGET_NODE_VERSION=$(sed -n '/"devEngines"/,/"onFail"/p' package.json | sed -n 's/.*"version": "\([^"]*\)".*/\1/p' | head -n 1)

print_separator
echo "[*] Planned hydration actions:"
while IFS= read -r ACTION || [ -n "$ACTION" ]; do
    [ -n "$ACTION" ] && echo "    -> $ACTION"
done < "$ACTION_QUEUE_PATH"
echo "    Report: $INITIAL_REPORT_PATH"

if [ "$PLAN_ONLY" = true ]; then
    echo "[*] Plan-only mode selected; no changes were made."
    exit 0
fi

print_separator
echo "[*] Applying queued actions..."

while IFS= read -r ACTION || [ -n "$ACTION" ]; do
    [ -z "$ACTION" ] && continue
    echo "    -> $ACTION"

    case "$ACTION" in
        align-node)
            NVM_SCRIPT="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
            if [ ! -s "$NVM_SCRIPT" ]; then
                echo "[!] Node.js $TARGET_NODE_VERSION is required, but a supported nvm.sh was not found."
                exit 1
            fi
            # shellcheck disable=SC1090
            . "$NVM_SCRIPT"
            nvm install "$TARGET_NODE_VERSION"
            nvm use "$TARGET_NODE_VERSION"
            ;;
        normalize-windows-path)
            echo "[!] Received a Windows-only action on a POSIX platform."
            exit 1
            ;;
        repair-pnpm)
            if [ "$(uname)" = "Darwin" ]; then
                LOCAL_PNPM_HOME="$HOME/Library/Application Support/pnpm"
            else
                LOCAL_PNPM_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/pnpm"
            fi
            rm -rf "$LOCAL_PNPM_HOME/pnpm" "$LOCAL_PNPM_HOME/pn" "$LOCAL_PNPM_HOME/.tools"
            install_pnpm_cmd="$(command -v curl >/dev/null 2>&1 && echo curl || echo wget)"
            if [ "$install_pnpm_cmd" = curl ]; then
                curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="$TARGET_PNPM_VERSION" sh -
            elif command -v wget >/dev/null 2>&1; then
                wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION="$TARGET_PNPM_VERSION" sh -
            else
                echo "[!] Neither curl nor wget is available to install pnpm."
                exit 1
            fi
            ;;
        align-pnpm)
            if command -v curl >/dev/null 2>&1; then
                curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="$TARGET_PNPM_VERSION" sh -
            elif command -v wget >/dev/null 2>&1; then
                wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION="$TARGET_PNPM_VERSION" sh -
            else
                echo "[!] Neither curl nor wget is available to install pnpm."
                exit 1
            fi
            ;;
        hydrate-dependencies)
            rm -rf node_modules
            pnpm install --frozen-lockfile --force
            ;;
        verify-dependencies)
            pnpm install --frozen-lockfile
            ;;
        *)
            echo "[!] Unknown hydration action: $ACTION"
            exit 1
            ;;
    esac
done < "$ACTION_QUEUE_PATH"

CURRENT_NODE_VERSION=$(node --version | sed 's/^v//')
CURRENT_PNPM_VERSION=$(pnpm --version)
if [ "$CURRENT_NODE_VERSION" != "$TARGET_NODE_VERSION" ] || [ "$CURRENT_PNPM_VERSION" != "$TARGET_PNPM_VERSION" ]; then
    echo "[!] Hydration completed with Node.js $CURRENT_NODE_VERSION and pnpm $CURRENT_PNPM_VERSION; expected Node.js $TARGET_NODE_VERSION and pnpm $TARGET_PNPM_VERSION."
    exit 1
fi

print_separator
echo "[+] HYDRATION SUCCESSFUL: Workspace is operational."
echo "    Initial diagnostics: $INITIAL_REPORT_PATH"
echo "    Execute 'pnpm dev' to launch Ultra-Tracker."
print_separator