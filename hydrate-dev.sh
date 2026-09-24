#!/bin/sh
# ==============================================================================
# Ultra-Tracker Workspace Hydration Script (macOS / Linux)
# ==============================================================================
set -e

REPOSITORY_ROOT=$(CDPATH= cd "$(dirname "$0")" && pwd)
cd "$REPOSITORY_ROOT"

# Visual Horizontal Separator Function
print_separator() {
    echo "--------------------------------------------------------------------------------"
}

print_separator
echo "   Ultra-Tracker Environment Hydration Pipeline (POSIX)"
print_separator

# ==============================================================================
# PHASE 1: DYNAMIC PNPM ENVIRONMENT INTEGRITY CHECK
# ==============================================================================
echo "[*] Verifying package manager orchestration configuration..."

# Default baseline fallback version if manifest parsing fails
TARGET_PNPM_VERSION="12.3.4"
TARGET_NODE_VERSION="22.11.0"

# 1. Confirm hydration is running against an intact repository checkout.
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ] || [ ! -f "pnpm-lock.yaml" ]; then
    echo "[!] Hydration must be run from an intact Ultra-Tracker checkout containing package.json, pnpm-workspace.yaml, and pnpm-lock.yaml."
    exit 1
fi

# 2. Parse target versions directly from package.json without heavy jq dependencies.
EXTRACTED_PNPM_VERSION=$(grep -m 1 '"packageManager":' package.json | sed -E 's/.*pnpm@([^"]+).*/\1/' || true)
if [ -n "$EXTRACTED_PNPM_VERSION" ]; then
    TARGET_PNPM_VERSION="$EXTRACTED_PNPM_VERSION"
    echo "    -> Target version extracted from manifest: pnpm@$TARGET_PNPM_VERSION"
fi

EXTRACTED_NODE_VERSION=$(sed -n '/"devEngines"/,/"onFail"/p' package.json | sed -n 's/.*"version": "\([^"]*\)".*/\1/p' | head -n 1)
if [ -n "$EXTRACTED_NODE_VERSION" ]; then
    TARGET_NODE_VERSION="$EXTRACTED_NODE_VERSION"
    echo "    -> Target version extracted from manifest: node@$TARGET_NODE_VERSION"
fi

# 3. Check if the pnpm executable command exists in the environment path
if ! command -v pnpm >/dev/null 2>&1; then
    echo ""
    echo "[!] ERROR: pnpm execution binary is missing from your environment PATH variables."
    echo "    Please run the official native standalone installer to bootstrap your environment."
    exit 1
fi

# 4. Query execution engine for version and capture standard error redirections
echo "[*] Testing execution engine stability..."
PNPM_CHECK=$(pnpm -v 2>&1 || true)

# 5. Intercept the legacy node-wrapped / architecture wrapper loop crash signature
if echo "$PNPM_CHECK" | grep -q "ERR_PNPM_NO_MATCHING_VERSION" || echo "$PNPM_CHECK" | grep -q "@pnpm/win-x64"; then
    echo ""
    echo "[!] CRITICAL ERROR DETECTED: Corrupted or legacy Node-wrapped pnpm layout discovered."
    echo "    Your environment wrapper tool is attempting to pull an obsolete engine package."
    echo "    This breaks because the pnpm 12 Rust rewrite discontinued architecture wrapper packages."
    echo ""

    # Prompt developer for authorization
    printf "    Would you like this script to auto-heal your local installation to native standalone v%s? (Y/N): " "$TARGET_PNPM_VERSION"
    read -r CHOICE

    if [ "$CHOICE" = "Y" ] || [ "$CHOICE" = "y" ]; then
        print_separator
        echo "[*] Flushing internal workspace tools and corrupted binary caches..."

        # Cross-platform home data path targets for macOS and Linux
        if [ "$(uname)" = "Darwin" ]; then
            LOCAL_PNPM_HOME="$HOME/Library/Application Support/pnpm"
        else
            LOCAL_PNPM_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/pnpm"
        fi

        # Purge localized executable shims causing the bad package mappings.
        for CORRUPTED_PATH in "$LOCAL_PNPM_HOME/pnpm" "$LOCAL_PNPM_HOME/pn" "$LOCAL_PNPM_HOME/.tools"; do
            if [ -e "$CORRUPTED_PATH" ]; then
                rm -rf "$CORRUPTED_PATH"
            fi
        done

        if command -v npm >/dev/null 2>&1; then
            echo "[*] Uninstalling conflict-prone global npm modules if they exist..."
            npm uninstall -g pnpm >/dev/null 2>&1 || true
        fi

        echo "[*] Provisioning clean native standalone runtime binary track for version $TARGET_PNPM_VERSION..."
        if command -v curl >/dev/null 2>&1; then
            curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="$TARGET_PNPM_VERSION" sh -
        elif command -v wget >/dev/null 2>&1; then
            wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION="$TARGET_PNPM_VERSION" sh -
        else
            echo "[!] Fail: Neither curl nor wget was found. Unable to fetch standalone runtime binary."
            exit 1
        fi

        print_separator
        echo "[+] Environment healed successfully!"
        echo "[!] ACTION REQUIRED: Please RESTART your terminal window and re-execute ./hydrate.sh"
        print_separator
        exit 0
    else
        echo "[!] Hydration aborted. You must align your local execution tracks manually before continuing."
        exit 1
    fi
fi

# 6. Require the exact pnpm and Node.js versions before continuing.
CURRENT_VERSION=$(echo "$PNPM_CHECK" | tr -d '[:space:]')
if [ "$CURRENT_VERSION" != "$TARGET_PNPM_VERSION" ]; then
    echo "[!] Local pnpm version ($CURRENT_VERSION) does not match the required version ($TARGET_PNPM_VERSION)."
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js is missing from PATH. Install Node.js v$TARGET_NODE_VERSION before hydrating."
    exit 1
fi

CURRENT_NODE_VERSION=$(node --version | sed 's/^v//')
if [ "$CURRENT_NODE_VERSION" != "$TARGET_NODE_VERSION" ]; then
    echo "[!] Local Node.js version ($CURRENT_NODE_VERSION) does not match the required version ($TARGET_NODE_VERSION)."
    exit 1
fi

echo "    [+] Environment verified healthy (pnpm v$CURRENT_VERSION, Node.js v$CURRENT_NODE_VERSION)."

# ==============================================================================
# PHASE 2: REPOSITORY DIRECTORY DEPENDENCY HYDRATION
# ==============================================================================
print_separator
echo "[*] Beginning monorepo environment hydration..."

# Flush broken dependencies to prevent locking or caching artifacts
if [ -d "node_modules" ]; then
    echo "    -> Flushing dirty workspace installations..."
    rm -rf node_modules
fi

echo "[*] Fetching package structures and building cache..."
if pnpm install --frozen-lockfile --force; then
    print_separator
    echo "[+] HYDRATION SUCCESSFUL: Workspace is operational."
    echo "    Execute 'pnpm dev' to launch Ultra-Tracker."
    print_separator
else
    print_separator
    echo "[!] Dependency orchestration step failed down-stream."
    print_separator
    exit 1
fi
