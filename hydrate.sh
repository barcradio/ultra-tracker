#!/bin/sh
# POSIX Bash Hydration Script
set -e

echo "=================================================="
echo " STARTING ELECTRON WORKSPACE SECURE HYDRATION     "
echo "=================================================="

# Step 1: Enforce session-level script isolation shield
echo -e "\n[1/5] Enforcing terminal security shield..."
export npm_config_ignore_scripts="true"

# Validate .npmrc baseline configuration properties
if [ -f .npmrc ]; then
  if ! grep -q "ignore-scripts=true" .npmrc; then
    echo "SECURITY CRITICAL: ignore-scripts=true must be defined in your .npmrc file before continuing."
    exit 1
  fi
else
  echo ".npmrc file is missing from the project root directory."
  exit 1
fi

# Step 2: Clear outdated lockfile metrics and run clean installation
echo -e "\n[2/5] Purging old caches and running secure installation..."
rm -rf node_modules
pnpm install

# Step 3: Remediate the outdated browser definitions database
echo -e "\n[3/5] Updating target browserslist definitions..."
npx update-browserslist-db@latest --yes

# Step 4: Manually extract framework binaries and recompile C++ components
echo -e "\n[4/5] Executing isolated platform binary extraction and compilation..."
node ./node_modules/electron/install.js
pnpm dlx @electron/rebuild --only better-sqlite3

# Step 5: Tear down temporary script block and boot workspace application frame
echo -e "\n[5/5] Launching ultra-tracker application environment..."
unset npm_config_ignore_scripts
pnpm start
