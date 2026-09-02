#!/usr/bin/env bash
# Shared helpers for iOS build/install scripts.
set -euo pipefail

ios_script_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

ios_root_dir() {
  cd "$(ios_script_dir)/.." && pwd
}

ios_read_env_value() {
  local env_file="$1"
  local key="$2"
  if [[ ! -f "$env_file" ]]; then
    return 0
  fi
  grep -E "^${key}=" "$env_file" | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

ios_sync_supabase_env() {
  local root_dir="${1:-$(ios_root_dir)}"
  local env_file="$root_dir/.env.local"
  local plist="$root_dir/ios/Logbook/Info.plist"

  if [[ ! -f "$plist" ]]; then
    echo "Missing Info.plist at $plist"
    return 1
  fi

  local url key
  url="$(ios_read_env_value "$env_file" "NEXT_PUBLIC_SUPABASE_URL")"
  key="$(ios_read_env_value "$env_file" "NEXT_PUBLIC_SUPABASE_ANON_KEY")"

  if [[ -z "$url" || -z "$key" ]]; then
    echo "Using Supabase values from ios/Logbook/Info.plist (.env.local not found or incomplete)."
    return 0
  fi

  /usr/libexec/PlistBuddy -c "Set :SUPABASE_URL $url" "$plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :SUPABASE_URL string $url" "$plist"
  /usr/libexec/PlistBuddy -c "Set :SUPABASE_ANON_KEY $key" "$plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :SUPABASE_ANON_KEY string $key" "$plist"
}

ios_print_build_errors() {
  local build_log="$1"
  echo ""
  echo "Build errors:"
  if [[ ! -f "$build_log" ]]; then
    echo "No build log at $build_log"
    return
  fi

  local swift_errors
  swift_errors="$(grep -E "\.swift:[0-9]+:[0-9]+: (error|warning):" "$build_log" || true)"
  if [[ -n "$swift_errors" ]]; then
    echo "$swift_errors" | tail -30
    return
  fi

  local generic_errors
  generic_errors="$(grep -E "^error:|\\*\\* BUILD FAILED \\*\\*|fatal error:|connection to this device could not be established|Timed out waiting for all destinations" "$build_log" || true)"
  if [[ -n "$generic_errors" ]]; then
    echo "$generic_errors" | tail -20
    if grep -q "connection to this device could not be established\|Timed out waiting for all destinations" "$build_log"; then
      ios_print_device_troubleshooting
    fi
    return
  fi

  tail -40 "$build_log"
}

WARP_KEEP_OFF="${HOME}/bin/warp-keep-off"

ios_warp_is_keeper_running() {
  [[ -x "$WARP_KEEP_OFF" ]] && "$WARP_KEEP_OFF" status 2>&1 | grep -q "WARP keeper: running"
}

# Ensures Cloudflare WARP stays off for local device/simulator builds.
ios_warp_off_if_needed() {
  if [[ ! -x "$WARP_KEEP_OFF" ]]; then
    echo "WARP helper not found — skipping warp-off"
    return 0
  fi

  if ios_warp_is_keeper_running; then
    echo "WARP already off"
    return 0
  fi

  echo "Turning WARP off (kept off for this session)..."
  "$WARP_KEEP_OFF" start >/dev/null 2>&1 || true
}

ios_detect_iphone_device_id() {
  python3 - <<'PY'
import json, subprocess, sys

def load_devices():
    try:
        out = subprocess.check_output(
            ["xcrun", "devicectl", "list", "devices", "--json-output", "-"],
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=20,
        )
        return json.loads(out).get("result", {}).get("devices", [])
    except Exception:
        return []

def is_iphone(device):
    return "iPhone" in device.get("hardwareProperties", {}).get("marketingName", "")

def transport(device):
    return device.get("connectionProperties", {}).get("transportType", "")

def is_ready(device):
    props = device.get("deviceProperties", {})
    if not props.get("ddiServicesAvailable", False):
        return False
    if not props.get("booted", False):
        return False
    return transport(device) in {"wired", "localNetwork", "local"}

devices = [d for d in load_devices() if is_iphone(d)]
ready = [d for d in devices if is_ready(d)]
if not ready:
    sys.exit(0)

wired = [d for d in ready if transport(d) == "wired"]
preferred = wired or ready
print(preferred[0].get("identifier", ""))
PY
}

ios_device_reachable() {
  local device_id="$1"
  [[ -n "$device_id" ]] || return 1

  python3 - "$device_id" <<'PY'
import re, subprocess, sys

device_id = sys.argv[1]
project = __import__("os").environ.get("IOS_VALIDATE_PROJECT", "")
scheme = __import__("os").environ.get("IOS_VALIDATE_SCHEME", "Logbook")
if not project:
    sys.exit(1)

try:
    out = subprocess.check_output(
        [
            "xcodebuild",
            "-showdestinations",
            "-project",
            project,
            "-scheme",
            scheme,
        ],
        stderr=subprocess.STDOUT,
        text=True,
        timeout=30,
    )
except subprocess.TimeoutExpired:
    sys.exit(1)
except subprocess.CalledProcessError as exc:
    out = exc.output or ""

pattern = re.compile(
    r"\{[^}]*platform:iOS[^}]*\bid[:=]" + re.escape(device_id) + r"\b[^}]*\}",
    re.MULTILINE,
)
for block in pattern.findall(out):
    if re.search(r"\berror:", block):
        continue
    sys.exit(0)

sys.exit(1)
PY
}

ios_device_devicectl_ready() {
  local device_id="$1"
  [[ -n "$device_id" ]] || return 1

  python3 - "$device_id" <<'PY'
import json, subprocess, sys

device_id = sys.argv[1]
try:
    out = subprocess.check_output(
        ["xcrun", "devicectl", "list", "devices", "--json-output", "-"],
        stderr=subprocess.DEVNULL,
        text=True,
        timeout=20,
    )
    devices = json.loads(out).get("result", {}).get("devices", [])
except Exception:
    sys.exit(1)

for device in devices:
    if device.get("identifier") != device_id:
        continue
    props = device.get("deviceProperties", {})
    transport = device.get("connectionProperties", {}).get("transportType", "")
    if not props.get("ddiServicesAvailable", False):
        sys.exit(1)
    if not props.get("booted", False):
        sys.exit(1)
    if transport not in {"wired", "localNetwork", "local"}:
        sys.exit(1)
    sys.exit(0)

sys.exit(1)
PY
}

ios_verify_device_ready() {
  local device_id="$1"
  if ! ios_device_devicectl_ready "$device_id"; then
    return 1
  fi
  if ! ios_device_reachable "$device_id"; then
    return 1
  fi
  return 0
}

ios_print_device_troubleshooting() {
  local device_id="${1:-}"
  echo ""
  echo "Xcode cannot connect to your iPhone."
  if [[ -n "$device_id" ]]; then
    echo "Device id: $device_id"
  fi
  echo ""
  echo "Try this:"
  echo "  1. Unlock the iPhone and keep it on the home screen"
  echo "  2. Re-plug the USB cable (or toggle Wi-Fi debugging off/on)"
  echo "  3. Tap Trust on the phone if prompted"
  echo "  4. Settings → Privacy & Security → Developer Mode → On (then restart phone)"
  echo "  5. Open Xcode → Window → Devices and Simulators and wait until the device shows Ready"
  echo "  6. If you switched phones, update IOS_DEVICE_ID in .env.local or remove it to auto-detect"
  echo "  7. Quit and reopen Xcode if the device shows with a yellow/orange status dot"
}
