#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/ios-build-common.sh
source "$ROOT_DIR/scripts/ios-build-common.sh"
PROJECT="$ROOT_DIR/ios/Logbook.xcodeproj"
SCHEME="Logbook"
CONFIG="${IOS_BUILD_CONFIG:-Debug}"
DERIVED_DATA="$ROOT_DIR/ios/DerivedData"
WARP_KEEP_OFF="${HOME}/bin/warp-keep-off"
BUILD_LOG="$ROOT_DIR/ios/last-device-build.log"

cleanup() {
  local exit_code=$?
  if [[ "$exit_code" -eq 0 ]]; then
    draw_progress 100 "Done"
    echo ""
    echo "Logbook reinstalled. Open it on your iPhone."
  else
    draw_progress 100 "Failed"
    echo ""
  fi
}
trap cleanup EXIT

draw_progress() {
  local pct="${1:-0}"
  local label="${2:-}"
  local width=32
  local filled=$((pct * width / 100))
  local empty=$((width - filled))
  local bar=""
  local i

  for ((i = 0; i < filled; i++)); do bar+="#"; done
  for ((i = 0; i < empty; i++)); do bar+="-"; done

  printf "\r[%s] %3d%%  %s" "$bar" "$pct" "$label"
}

warp_off_if_needed() {
  ios_warp_off_if_needed
}

animate_while_building() {
  local pid=$1
  local pct=18

  while kill -0 "$pid" 2>/dev/null; do
    draw_progress "$pct" "Building Logbook..."
    sleep 2
    pct=$((pct + 2))
    if [[ "$pct" -gt 82 ]]; then
      pct=82
    fi
  done
}

if [[ ! -d "$PROJECT" ]]; then
  echo "Missing Xcode project at $PROJECT"
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Xcode command line tools not found. Install Xcode from the App Store."
  exit 1
fi

draw_progress 0 "Starting iOS reinstall..."
echo ""
ios_sync_supabase_env "$ROOT_DIR"
warp_off_if_needed
echo ""

draw_progress 10 "Looking for iPhone..."
DEVICE_ID="${IOS_DEVICE_ID:-}"
if [[ -z "$DEVICE_ID" && -f "$ROOT_DIR/.env.local" ]]; then
  DEVICE_ID="$(ios_read_env_value "$ROOT_DIR/.env.local" "IOS_DEVICE_ID")"
fi

AUTO_DEVICE_ID="$(ios_detect_iphone_device_id || true)"
if [[ -z "$DEVICE_ID" ]]; then
  DEVICE_ID="$AUTO_DEVICE_ID"
fi

if [[ -z "$DEVICE_ID" ]]; then
  echo ""
  echo "No iPhone detected. Connect, unlock, and trust this Mac."
  ios_print_device_troubleshooting
  exit 1
fi

IOS_VALIDATE_PROJECT="$PROJECT"
IOS_VALIDATE_SCHEME="$SCHEME"
if ! ios_verify_device_ready "$DEVICE_ID"; then
  if [[ -n "$AUTO_DEVICE_ID" && "$AUTO_DEVICE_ID" != "$DEVICE_ID" ]]; then
    echo ""
    echo "Configured device is not ready; using connected iPhone instead."
    DEVICE_ID="$AUTO_DEVICE_ID"
  fi
fi

if ! ios_verify_device_ready "$DEVICE_ID"; then
  echo ""
  ios_print_device_troubleshooting "$DEVICE_ID"
  exit 1
fi

draw_progress 14 "iPhone found"
echo ""

TEAM="${IOS_DEVELOPMENT_TEAM:-}"
if [[ -z "$TEAM" && -f "$ROOT_DIR/.env.local" ]]; then
  TEAM="$(grep -E '^IOS_DEVELOPMENT_TEAM=' "$ROOT_DIR/.env.local" | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi

SIGN_ARGS=()
if [[ -n "$TEAM" ]]; then
  SIGN_ARGS+=(DEVELOPMENT_TEAM="$TEAM" -allowProvisioningUpdates)
fi

draw_progress 16 "Building Logbook..."
set +e
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration "$CONFIG" \
  -destination "id=$DEVICE_ID" \
  -destination-timeout 15 \
  -derivedDataPath "$DERIVED_DATA" \
  "${SIGN_ARGS[@]}" \
  build >"$BUILD_LOG" 2>&1 &
BUILD_PID=$!
animate_while_building "$BUILD_PID"
wait "$BUILD_PID"
BUILD_STATUS=$?
set -e

if [[ "$BUILD_STATUS" -ne 0 ]]; then
  ios_print_build_errors "$BUILD_LOG"
  exit "$BUILD_STATUS"
fi

draw_progress 86 "Build complete"
echo ""

APP_PATH="$DERIVED_DATA/Build/Products/${CONFIG}-iphoneos/Logbook.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Build finished but app bundle not found at:"
  echo "$APP_PATH"
  exit 1
fi

draw_progress 90 "Installing on iPhone..."
if ! xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH" >/dev/null 2>&1; then
  echo ""
  echo "Install failed. Unlock your iPhone and retry."
  xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
  exit 1
fi

draw_progress 95 "Installed"
echo ""

# cleanup trap handles WARP on + final message
exit 0
