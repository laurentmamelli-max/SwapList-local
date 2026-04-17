#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT_DIR/out"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

javac -d "$OUT_DIR" $(find "$ROOT_DIR/src/main/java" -name '*.java' | sort)
java -cp "$OUT_DIR" demo.SwapListDemo
