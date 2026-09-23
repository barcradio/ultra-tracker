#!/bin/sh
set -e

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
deep=false

case "${1:-}" in
  "") ;;
  --deep) deep=true ;;
  --help|-h)
    printf '%s\n' 'Usage: sh ./clean-dev.sh [--deep]'
    exit 0
    ;;
  *)
    printf 'Unknown option: %s\n' "$1" >&2
    exit 2
    ;;
esac

printf '%s\n' 'Cleaning disposable development artifacts...'

for target in node_modules dist out coverage reports .stryker-tmp; do
  path=$root/$target
  if [ -e "$path" ]; then
    rm -rf "$path"
    printf 'Removed %s\n' "$target"
  fi
done

for path in "$root"/*.log*; do
  if [ -f "$path" ]; then
    rm -f "$path"
  fi
done

if [ "$deep" = true ]; then
  printf '%s\n' 'Cleaning local runtime and generated data...'
  for target in Database opensplittime.env rfid.env resources/ost-api-responses resources/dns-dnf-files resources/config/mock-event-archive.zip; do
    path=$root/$target
    if [ -e "$path" ]; then
      rm -rf "$path"
      printf 'Removed %s\n' "$target"
    fi
  done
fi

printf '%s\n' 'Development cleanup complete.'