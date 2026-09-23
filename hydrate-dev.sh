#!/bin/sh
# POSIX Shell Hydration Script
set -e

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$root"

printf '%s\n' '=================================================='
printf '%s\n' ' STARTING ELECTRON WORKSPACE SECURE HYDRATION     '
printf '%s\n' '=================================================='

# Step 1: Enforce session-level script isolation shield
printf '%s\n' '' '[1/4] Enforcing terminal security shield...'
export npm_config_ignore_scripts="true"

# Validate .npmrc baseline configuration properties
if [ -f .npmrc ]; then
  if ! grep -q "ignore-scripts=true" .npmrc; then
    printf '%s\n' 'SECURITY CRITICAL: ignore-scripts=true must be defined in your .npmrc file before continuing.' >&2
    exit 1
  fi
else
  printf '%s\n' '.npmrc file is missing from the project root directory.' >&2
  exit 1
fi

# Step 2: Clear outdated lockfile metrics and run clean installation
printf '%s\n' '' '[2/4] Purging old caches and running secure installation...'
rm -rf node_modules
pnpm install

# Step 3: Remediate the outdated browser definitions database
printf '%s\n' '' '[3/4] Updating target browserslist definitions...'
npx update-browserslist-db@latest --yes

# Step 4: Manually extract framework binaries and recompile C++ components
printf '%s\n' '' '[4/4] Executing isolated platform binary extraction and compilation...'
node ./node_modules/electron/install.js
pnpm dlx @electron/rebuild --only better-sqlite3

unset npm_config_ignore_scripts
printf '%s\n' "Development hydration complete. Start the app with 'pnpm dev' or 'pnpm start'."