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
  generic_errors="$(grep -E "^error:|\\*\\* BUILD FAILED \\*\\*|fatal error:" "$build_log" || true)"
  if [[ -n "$generic_errors" ]]; then
    echo "$generic_errors" | tail -20
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
