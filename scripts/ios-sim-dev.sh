#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/ios-build-common.sh
source "$ROOT_DIR/scripts/ios-build-common.sh"

PROJECT="$ROOT_DIR/ios/Logbook.xcodeproj"
SCHEME="Logbook"
CONFIG="Debug"
DERIVED_DATA="$ROOT_DIR/ios/DerivedData"
SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-iPhone 17 Pro Max}"
BUNDLE_ID="com.himanshuain.logbook"
APP_PATH="$DERIVED_DATA/Build/Products/${CONFIG}-iphonesimulator/Logbook.app"
INJECTION_APP="/Applications/InjectionIII.app"
BUILD_LOG="$ROOT_DIR/ios/last-sim-build.log"

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

simulator_udid() {
  python3 - <<PY
import json, subprocess, sys
name = """$SIMULATOR_NAME"""
try:
    out = subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"], text=True)
    data = json.loads(out)
except Exception:
    sys.exit(0)
for runtime, devices in data.get("devices", {}).items():
    if "iOS" not in runtime:
        continue
    for device in devices:
        if device.get("name") == name and device.get("isAvailable", True):
            print(device.get("udid", ""))
            sys.exit(0)
PY
}

build_for_simulator() {
  local team_args=()
  if [[ -f "$ROOT_DIR/.env.local" ]]; then
    local team
    team="$(ios_read_env_value "$ROOT_DIR/.env.local" "IOS_DEVELOPMENT_TEAM")"
    if [[ -n "$team" ]]; then
      team_args+=(DEVELOPMENT_TEAM="$team")
    fi
  fi

  xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration "$CONFIG" \
    -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
    -derivedDataPath "$DERIVED_DATA" \
    "${team_args[@]}" \
    build >"$BUILD_LOG" 2>&1
}

install_and_launch() {
  xcrun simctl install "$SIM_UDID" "$APP_PATH"
  xcrun simctl launch "$SIM_UDID" "$BUNDLE_ID" >/dev/null
}

if [[ ! -d "$PROJECT" ]]; then
  echo "Missing Xcode project at $PROJECT"
  exit 1
fi

ios_sync_supabase_env "$ROOT_DIR"
ios_warp_off_if_needed
echo ""

SIM_UDID="$(simulator_udid)"
if [[ -z "$SIM_UDID" ]]; then
  echo "Simulator not found: $SIMULATOR_NAME"
  echo "Open Xcode → Window → Devices and Simulators to confirm the name."
  exit 1
fi

draw_progress 5 "Booting simulator..."
xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
open -a Simulator

if [[ -d "$INJECTION_APP" ]]; then
  open -a InjectionIII
  draw_progress 12 "InjectionIII ready (hot reload on save)"
else
  draw_progress 12 "InjectionIII not installed — using auto-rebuild"
fi
echo ""

draw_progress 20 "Building for simulator..."
if ! build_for_simulator; then
  ios_print_build_errors "$BUILD_LOG"
  exit 1
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo ""
  echo "Build finished but app bundle missing at $APP_PATH"
  exit 1
fi

draw_progress 70 "Installing on simulator..."
install_and_launch
draw_progress 100 "Running on $SIMULATOR_NAME"
echo ""
echo ""

if [[ -d "$INJECTION_APP" ]]; then
  echo "Hot reload enabled:"
  echo "  1. In InjectionIII: Open Project → select ios/Logbook.xcodeproj"
  echo "  2. Keep the simulator running"
  echo "  3. Edit Swift files and save — UI updates in ~1s"
  echo ""
  echo "Tip: You can also run from Xcode (▶) once; InjectionIII still hot-reloads on save."
else
  echo "Install InjectionIII for instant hot reload (free):"
  echo "  https://github.com/johnno1962/InjectionIII/releases"
  echo ""
  echo "Fallback: watching Swift files and rebuilding automatically..."
  echo "Press Ctrl+C to stop."
  echo ""

  if ! command -v fswatch >/dev/null 2>&1; then
    echo "Install fswatch for auto-rebuild: brew install fswatch"
    exit 0
  fi

  fswatch -o "$ROOT_DIR/ios/Logbook" --exclude '.*' --include '\.swift$' | while read -r _; do
    printf "\nSwift changed — rebuilding..."
    if build_for_simulator && [[ -d "$APP_PATH" ]]; then
      install_and_launch
      echo "Updated on simulator."
    else
      ios_print_build_errors "$BUILD_LOG"
      echo "Rebuild failed — fix errors and save again."
    fi
  done
fi
