#!/usr/bin/env bash
# =============================================================================
# setup-mediapipe.sh — Copy MediaPipe WASM + download model to public/mediapipe/
# Run once after `npm install`.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TARGET="$PROJECT_DIR/public/mediapipe"
WASM_SRC="$PROJECT_DIR/node_modules/@mediapipe/tasks-vision/wasm"
BUNDLE_SRC="$PROJECT_DIR/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"

MODEL_URL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

echo "==> Setting up MediaPipe local files in public/mediapipe/"

# Create target directories
mkdir -p "$TARGET/wasm"

# Copy WASM runtime
echo "    Copying WASM files..."
cp "$WASM_SRC"/vision_wasm_internal.js    "$TARGET/wasm/"
cp "$WASM_SRC"/vision_wasm_internal.wasm  "$TARGET/wasm/"
cp "$WASM_SRC"/vision_wasm_nosimd_internal.js   "$TARGET/wasm/"
cp "$WASM_SRC"/vision_wasm_nosimd_internal.wasm "$TARGET/wasm/"

# Copy JS bundle
echo "    Copying vision_bundle.mjs..."
cp "$BUNDLE_SRC" "$TARGET/"

# Download model (skip if already exists)
if [ -f "$TARGET/pose_landmarker_lite.task" ]; then
  echo "    Model already exists, skipping download."
else
  echo "    Downloading pose model (~4 MB)..."
  curl -sL "$MODEL_URL" -o "$TARGET/pose_landmarker_lite.task"
  echo "    Model downloaded."
fi

echo "==> Done! MediaPipe files are in public/mediapipe/"
