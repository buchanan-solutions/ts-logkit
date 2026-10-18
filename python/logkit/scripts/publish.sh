#!/bin/bash
# python/logkit/scripts/publish.sh — manual Hatch publish (test vs live env)

set -euo pipefail

LIVE=false
for arg in "$@"; do
  case "$arg" in
    --live)
      LIVE=true
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--live]" >&2
      exit 1
      ;;
  esac
done

PKG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PKG_ROOT/.env.test"
if [ "$LIVE" = true ]; then
  ENV_FILE="$PKG_ROOT/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

cd "$PKG_ROOT"
hatch publish
