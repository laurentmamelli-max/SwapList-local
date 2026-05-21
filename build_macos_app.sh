#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$ROOT_DIR/.build/macos"
APP_NAME="Swapmod Local.app"
APP_DIR="$DIST_DIR/$APP_NAME"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
SUPPORT_DIR="$RESOURCES_DIR/Support"
ICONSET_DIR="$BUILD_DIR/Swapmod.iconset"
ICON_TOOL="$BUILD_DIR/icon-generator"
APP_BIN="$MACOS_DIR/Swapmod Local"
MASTER_TIFF="$BUILD_DIR/AppIcon.tiff"
EMBEDDED_ENGINE_DIR="$SUPPORT_DIR/engines"
HEADLESS_RUNTIME_SOURCE="$ROOT_DIR/engine/runtime/headless"

mkdir -p "$DIST_DIR" "$BUILD_DIR"
rm -rf "$APP_DIR" "$ICONSET_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR" "$SUPPORT_DIR/tools" "$SUPPORT_DIR/web" "$EMBEDDED_ENGINE_DIR"

clang -fobjc-arc \
  -framework Cocoa \
  "$ROOT_DIR/macos/IconGenerator.m" \
  -o "$ICON_TOOL"
"$ICON_TOOL" "$ICONSET_DIR"
sips -s format tiff "$ICONSET_DIR/icon_512x512@2x.png" --out "$MASTER_TIFF" >/dev/null
tiff2icns "$MASTER_TIFF" "$RESOURCES_DIR/AppIcon.icns"

clang -fobjc-arc \
  -framework Cocoa \
  -framework WebKit \
  "$ROOT_DIR/macos/SwapmodApp.m" \
  -o "$APP_BIN"

cp "$ROOT_DIR/tools/serve_swapmod.py" "$SUPPORT_DIR/tools/serve_swapmod.py"
cp "$ROOT_DIR/tools/swapmod_slicer.py" "$SUPPORT_DIR/tools/swapmod_slicer.py"
cp "$ROOT_DIR/tools/swapmod_native_slicer.py" "$SUPPORT_DIR/tools/swapmod_native_slicer.py"
cp -R "$ROOT_DIR/web/." "$SUPPORT_DIR/web/"
chmod +x "$SUPPORT_DIR/tools/serve_swapmod.py"
chmod +x "$SUPPORT_DIR/tools/swapmod_slicer.py"
chmod +x "$SUPPORT_DIR/tools/swapmod_native_slicer.py"

if [ -d "$HEADLESS_RUNTIME_SOURCE" ] && [ -f "$HEADLESS_RUNTIME_SOURCE/engine.json" ]; then
  echo "Embedding headless slicer runtime..."
  cp -R "$HEADLESS_RUNTIME_SOURCE" "$EMBEDDED_ENGINE_DIR/headless"
else
  echo "Headless slicer runtime not found in engine/runtime/headless; app will rely on system fallback if available."
fi

cat > "$CONTENTS_DIR/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Swapmod Local</string>
  <key>CFBundleExecutable</key>
  <string>Swapmod Local</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.swapmod.local.native</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Swapmod Local</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.utilities</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

if command -v codesign >/dev/null 2>&1; then
  codesign --force --deep --sign - "$APP_DIR" >/dev/null 2>&1 || true
fi

echo "Created native app:"
echo "  $APP_DIR"
