#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
AVD_NAME="${AVD_NAME:-Pixel_6_Pro}"
APP_ID="${APP_ID:-com.researchpalfrontend}"
METRO_PORT="${METRO_PORT:-8081}"
EMULATOR_GPU_MODE="${EMULATOR_GPU_MODE:-swiftshader_indirect}"
EMULATOR_MEMORY_MB="${EMULATOR_MEMORY_MB:-2048}"

start_metro_in_terminal() {
  local metro_cmd="cd \"$PROJECT_ROOT\" && npx react-native start"

  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -lc "$metro_cmd; exec bash"
    return 0
  fi

  if command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -lc "$metro_cmd; exec bash"
    return 0
  fi

  if command -v konsole >/dev/null 2>&1; then
    konsole --noclose -e bash -lc "$metro_cmd"
    return 0
  fi

  if command -v xfce4-terminal >/dev/null 2>&1; then
    xfce4-terminal --hold -e "bash -lc '$metro_cmd'"
    return 0
  fi

  if command -v kitty >/dev/null 2>&1; then
    kitty bash -lc "$metro_cmd"
    return 0
  fi

  return 1
}

emulator_running() {
  adb devices | awk 'NR>1 {print $1}' | grep -q '^emulator-'
}

get_emulator_serial() {
  adb devices | awk 'NR>1 && $2=="device" && $1 ~ /^emulator-/ {print $1; exit}'
}

wait_for_device_property() {
  local serial="$1"
  local prop="$2"
  local expected="$3"
  local value=""

  value=$(adb -s "$serial" shell getprop "$prop" 2>/dev/null | tr -d '\r' || true)
  [ "$value" = "$expected" ]
}

wait_for_launcher() {
  local serial="$1"
  local retries=30

  while [ $retries -gt 0 ]; do
    if adb -s "$serial" shell cmd package resolve-activity --brief android.intent.action.MAIN android.intent.category.HOME >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    retries=$((retries - 1))
  done

  return 1
}

wait_for_metro() {
  local retries=30

  while [ $retries -gt 0 ]; do
    if curl -fsS "http://127.0.0.1:${METRO_PORT}/status" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    retries=$((retries - 1))
  done

  return 1
}

ensure_metro() {
  if wait_for_metro; then
    echo "[coolBoot] Metro already running on port $METRO_PORT"
    return 0
  fi

  echo "[coolBoot] starting Metro bundler in a terminal window"
  if ! start_metro_in_terminal; then
    echo "[coolBoot] warning: no terminal emulator found, falling back to background Metro"
    echo "[coolBoot] warning: Metro keyboard shortcuts and DevTools launch may not work in fallback mode"
    nohup npx react-native start > /tmp/metro.log 2>&1 &
  fi

  echo "[coolBoot] waiting for Metro on port $METRO_PORT"
  if ! wait_for_metro; then
    echo "[coolBoot] Metro did not become ready on port $METRO_PORT"
    echo "[coolBoot] if Metro opened in a separate terminal, check that window for errors"
    exit 1
  fi
}

if emulator_running; then
  echo "[coolBoot] emulator already running, reusing it"
else
  echo "[coolBoot] starting $AVD_NAME with conservative settings"
  nohup emulator -avd "$AVD_NAME" -gpu "$EMULATOR_GPU_MODE" -memory "$EMULATOR_MEMORY_MB" -no-snapshot -no-audio -camera-back none -camera-front none > /tmp/emulator.log 2>&1 &
fi

sleep 10

echo "[coolBoot] waiting for emulator to come online"
max=300
while true; do
  EMULATOR_SERIAL="$(get_emulator_serial || true)"
  status=""
  boot=""
  devboot=""
  bootanim=""
  bootanim_exit=""

  if [ -n "$EMULATOR_SERIAL" ]; then
    status="device"
    boot=$(adb -s "$EMULATOR_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
    devboot=$(adb -s "$EMULATOR_SERIAL" shell getprop dev.bootcomplete 2>/dev/null | tr -d '\r' || true)
    bootanim=$(adb -s "$EMULATOR_SERIAL" shell getprop init.svc.bootanim 2>/dev/null | tr -d '\r' || true)
    bootanim_exit=$(adb -s "$EMULATOR_SERIAL" shell getprop service.bootanim.exit 2>/dev/null | tr -d '\r' || true)
  fi

  echo "[coolBoot] serial=${EMULATOR_SERIAL:-none} status=$status boot=$boot devboot=$devboot bootanim=$bootanim bootanim_exit=$bootanim_exit"

  if [ "$status" = "device" ] && [ "$boot" = "1" ] && [ "$devboot" = "1" ] && [ "$bootanim" = "stopped" ]; then
    echo "[coolBoot] emulator ready"
    break
  fi

  if [ $max -le 0 ]; then
    echo "[coolBoot] timeout waiting for emulator ready"
    echo "[coolBoot] emulator log:"
    tail -n 50 /tmp/emulator.log
    exit 1
  fi

  sleep 3
  max=$((max - 3))
done

echo "[coolBoot] waiting for launcher and package manager"
if ! wait_for_launcher "$EMULATOR_SERIAL"; then
  echo "[coolBoot] launcher did not become ready in time"
  exit 1
fi

echo "[coolBoot] letting the emulator settle"
sleep 10

EMULATOR_SERIAL="$(get_emulator_serial || true)"
if [ -z "$EMULATOR_SERIAL" ]; then
  echo "[coolBoot] no ready emulator found"
  exit 1
fi

echo "[coolBoot] waking emulator screen"
adb -s "$EMULATOR_SERIAL" shell input keyevent 82 >/dev/null 2>&1 || true

ensure_metro

echo "[coolBoot] connecting $EMULATOR_SERIAL to Metro"
adb -s "$EMULATOR_SERIAL" reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}" >/dev/null
adb -s "$EMULATOR_SERIAL" reverse --list | grep -q "tcp:${METRO_PORT} tcp:${METRO_PORT}" || {
  echo "[coolBoot] failed to configure adb reverse for Metro"
  exit 1
}

echo "[coolBoot] running react-native run-android"
npx react-native run-android --device "$EMULATOR_SERIAL" --no-packager

echo "[coolBoot] launching app from launcher intent on $EMULATOR_SERIAL"
adb -s "$EMULATOR_SERIAL" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
