#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_PATH="$DIST_DIR/Swapmod Local.app"
DMG_STAGE="$ROOT_DIR/.build/dmg"
DMG_PATH="$DIST_DIR/Swapmod-Local.dmg"

bash "$ROOT_DIR/build_macos_app.sh"

rm -rf "$DMG_STAGE" "$DMG_PATH"
mkdir -p "$DMG_STAGE"
cp -R "$APP_PATH" "$DMG_STAGE/"
ln -s /Applications "$DMG_STAGE/Applications"

hdiutil create \
  -volname "Swapmod Local" \
  -srcfolder "$DMG_STAGE" \
  -ov \
  -format UDZO \
  "$DMG_PATH" >/tmp/swapmod_dmg_build.log

echo "Created DMG:"
echo "  $DMG_PATH"
