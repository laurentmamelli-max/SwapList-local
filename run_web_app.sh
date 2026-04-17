#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-4173}"

echo "Serving /Users/laurent/Documents/swapmod/web on http://127.0.0.1:${PORT}"
cd "$ROOT_DIR/web"
python3 -m http.server "$PORT"
