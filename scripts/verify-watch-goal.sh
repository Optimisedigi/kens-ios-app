#!/usr/bin/env bash
#
# verify-watch-goal.sh — composite structural verifier for the
# "Apple Watch habit-tick companion app" Goal.
#
# Runs (fail-fast, in order):
#   1. npm run typecheck
#   2. npm run lint
#   3. npm run format:check
#   4. watch-bridge unit test (vitest, scoped to src/utils/__tests__/watchBridge.test.ts)
#   5. node scripts/inspect-watch-target.mjs   (post-prebuild ios/ tree)
#   6. node scripts/inspect-ipa.mjs "$ARTIFACTS_IPA"  — only if ARTIFACTS_IPA is set
#
# Environment variables (optional):
#   ARTIFACTS_IPA   Path to an .ipa to structurally inspect. If unset/empty,
#                   step 6 is skipped (the structural watch-target check still
#                   runs; the IPA check is meant for post-`eas build` runs).
#
# On success: prints `VERIFY_OK` on its own line and exits 0.
# On any failure: prints the failing command and line, exits non-zero.
#
# Designed to run in well under 60s on a warm tree.

set -euo pipefail

# Resolve the repo root from this script's location so the verifier works
# regardless of the caller's cwd.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# Pretty failure trap: report the failing line + command so the log is
# diagnostic even when many gates are chained.
on_err() {
  local exit_code=$?
  local line_no=$1
  local cmd=$2
  echo ""
  echo "VERIFY_FAIL: command exited ${exit_code} at line ${line_no}: ${cmd}" >&2
  exit "${exit_code}"
}
trap 'on_err "${LINENO}" "${BASH_COMMAND}"' ERR

section() {
  echo ""
  echo "==> $*"
}

section "typecheck"
npm run typecheck

section "lint"
npm run lint

section "format:check"
npm run format:check

section "watch-bridge unit test"
npm test -- src/utils/__tests__/watchBridge.test.ts

section "inspect-watch-target (ios/)"
node scripts/inspect-watch-target.mjs

if [[ -n "${ARTIFACTS_IPA:-}" ]]; then
  section "inspect-ipa (\$ARTIFACTS_IPA=${ARTIFACTS_IPA})"
  node scripts/inspect-ipa.mjs "${ARTIFACTS_IPA}"
else
  section "ipa check  (skipped — set ARTIFACTS_IPA to enable)"
fi

echo ""
echo "VERIFY_OK"
