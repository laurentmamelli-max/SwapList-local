#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT_DIR/out-official"
JAR_PATH="$ROOT_DIR/swaplist-bin-0.2.jar"
SOURCE_FILE="$ROOT_DIR/examples/official-jar/SwapListOfficialJarDemo.java"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

javac -cp "$JAR_PATH" -d "$OUT_DIR" "$SOURCE_FILE"
java -cp "$OUT_DIR:$JAR_PATH" SwapListOfficialJarDemo
