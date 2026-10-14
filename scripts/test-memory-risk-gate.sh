#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKER="$ROOT_DIR/scripts/check-memory-risks.sh"
REPORT="$ROOT_DIR/build/memory-risk/report.md"
EVIDENCE="$ROOT_DIR/build/memory-risk-self-test"
mkdir -p "$EVIDENCE"

expect_failure() {
  local name="$1"
  local injection="$2"
  if bash -c "$injection" _ "$CHECKER" >"$EVIDENCE/$name.stdout" 2>"$EVIDENCE/$name.stderr"; then
    printf 'Memory risk regression: %s incorrectly succeeded\n' "$name" >&2
    exit 1
  fi
  if ! grep -Fq '结论：**FAIL**' "$REPORT"; then
    printf 'Memory risk regression: %s left a successful report\n' "$name" >&2
    exit 1
  fi
  cp "$REPORT" "$EVIDENCE/$name-report.md"
}

expect_failure missing-rg '
  command() {
    if [[ "${1:-}" == "-v" && "${2:-}" == "rg" ]]; then return 1; fi
    builtin command "$@"
  }
  export -f command
  bash "$1"
'

expect_failure scan-error '
  rg() { printf "synthetic source read error\n" >&2; return 2; }
  export -f rg
  bash "$1"
'

REAL_RG="$(command -v rg)"; export REAL_RG
expect_failure inventory-error '
  rg() {
    if [[ "$2" == "Process\(\)" ]]; then return 2; fi
    "$REAL_RG" "$@"
  }
  export -f rg
  bash "$1"
'

bash "$CHECKER"
printf 'Memory risk gate regressions: PASS (missing tool, scan error, inventory error, normal scan)\n'
