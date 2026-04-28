#!/usr/bin/env bash
# Push to origin/main and watch the resulting GitHub Actions deploy run.
#
# Behavior:
#   - If nothing to push: report and exit 0.
#   - Otherwise: poll for the Pages workflow run tied to the just-pushed
#     SHA (up to ~20s), then stream its progress with `gh run watch`.
#   - Exits non-zero if the deploy fails or no run is found.
#
# Replaces the inline `sleep 5; gh run watch` recipe that was opaque
# (blind sleep) and interactive (run picker prompted when multiple
# workflows were in flight).

set -euo pipefail

REPO_URL="https://github.com/ufo2mstar/ufo2mstar.github.io"
WORKFLOW_NAME="Deploy Hugo site to Pages"
POLL_ATTEMPTS=10
POLL_INTERVAL=2

push_output=$(git push origin main 2>&1)
echo "$push_output"

if echo "$push_output" | grep -q 'Everything up-to-date'; then
  echo "Nothing to push. Site is already current."
  exit 0
fi

sha=$(git rev-parse HEAD)
echo "Pushed $sha. Waiting for GitHub Actions run to register..."

run_id=""
for _ in $(seq 1 "$POLL_ATTEMPTS"); do
  run_id=$(gh run list \
    --commit "$sha" \
    --workflow "$WORKFLOW_NAME" \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId' 2>/dev/null || true)
  if [ -n "$run_id" ] && [ "$run_id" != "null" ]; then
    break
  fi
  printf "."
  sleep "$POLL_INTERVAL"
done
echo

if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
  echo "No '$WORKFLOW_NAME' run found for $sha after $((POLL_ATTEMPTS * POLL_INTERVAL))s."
  echo "Check: gh run list"
  exit 1
fi

echo "Watching run $run_id ($REPO_URL/actions/runs/$run_id)..."
if ! gh run watch "$run_id" --exit-status; then
  echo
  echo "Deploy FAILED. Check: gh run view $run_id"
  exit 1
fi

echo "Live at https://ufo2mstar.github.io/"
