#!/usr/bin/env bash
# Build and package the Decky install zip: release/spindeck-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
bun build/build.ts
rm -rf release/pkg && mkdir -p release/pkg/spindeck/dist
cp dist/index.js release/pkg/spindeck/dist/
cp plugin.json package.json main.py README.md LICENSE release/pkg/spindeck/
(cd release/pkg && zip -qr "../spindeck-${VERSION}.zip" spindeck)
rm -rf release/pkg
echo "release/spindeck-${VERSION}.zip"
