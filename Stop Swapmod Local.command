#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec /usr/bin/python3 "$ROOT_DIR/tools/serve_swapmod.py" stop
