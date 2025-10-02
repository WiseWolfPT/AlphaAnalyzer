#!/usr/bin/env bash

# Common helpers for monitoring scripts

set -euo pipefail

# Colors
RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; BLUE="\033[34m"; RESET="\033[0m"

base_dir() {
  local SRC_DIR
  SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "$SRC_DIR"
}

resolve_base_url() {
  local arg_url=${1:-}
  local base
  if [[ -n "${arg_url}" ]]; then
    base="$arg_url"
  elif [[ -n "${TARGET_URL:-}" ]]; then
    base="$TARGET_URL"
  else
    base="http://localhost:3001"
  fi
  # Strip trailing slash
  base="${base%/}"
  echo "$base"
}

resolve_log_dir() {
  local default_local
  default_local="$(base_dir)/logs"
  local target="/var/log/alfalyzer/monitoring"
  if mkdir -p "$target" 2>/dev/null && [[ -w "$target" ]]; then
    echo "$target"
    return 0
  fi
  mkdir -p "$default_local" 2>/dev/null || true
  echo "$default_local"
}

log_line() {
  local logfile="$1"; shift
  local line="$*"
  printf "%s %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$line" >> "$logfile" 2>/dev/null || true
}

ok() { printf "%b%s%b\n" "$GREEN" "$*" "$RESET"; }
warn() { printf "%b%s%b\n" "$YELLOW" "$*" "$RESET"; }
fail() { printf "%b%s%b\n" "$RED" "$*" "$RESET"; }

curl_json() {
  # Usage: curl_json URL [HEADER...]
  local url="$1"; shift
  curl -sS -H 'Accept: application/json' "$@" "$url"
}

curl_metrics() {
  # Usage: curl_metrics URL [CURL_ARGS...]
  local url="$1"; shift
  curl -sS -o /dev/null -w '%{http_code} %{time_total}' "$@" "$url"
}

percentile() {
  # Read numbers from stdin, compute pXX (arg1 as integer 1..100)
  local p=${1:-95}
  awk -v p="$p" '
    {a[NR]=$1} END{ 
      if (NR==0) {print 0; exit}
      n=asort(a)
      idx=int((p/100.0)*n + 0.5); if (idx<1) idx=1; if (idx>n) idx=n;
      print a[idx]
    }'
}

