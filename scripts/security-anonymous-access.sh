#!/usr/bin/env bash
# Run on a clean GitHub-hosted runner with no cookies, tokens or login session.
# Only status codes and access-control classifications are logged.
set -euo pipefail

base="https://segundo-cerebro.mamg97.workers.dev"
headers="$(mktemp)"
trap 'rm -f "$headers"' EXIT
failed=0

check() {
  local label="$1" path="$2" status location
  : > "$headers"
  status="$(curl --silent --show-error --max-time 25 \
    --retry 1 --retry-delay 1 --retry-all-errors \
    --output /dev/null --dump-header "$headers" \
    --write-out '%{http_code}' "${base}${path}")" || {
      echo "${label}: REQUEST_FAILED"
      failed=1
      return
    }
  location="$(sed -n 's/^[Ll]ocation:[[:space:]]*//p' "$headers" | tr -d '\r' | tail -n 1)"
  case "$status" in
    301|302|303|307|308)
      if [[ "$location" == *"cloudflareaccess.com"* || "$location" == *"/cdn-cgi/access/login"* ]]; then
        echo "${label}: ACCESS_CHALLENGE (HTTP ${status})"
      else
        echo "${label}: UNVERIFIED_REDIRECT (HTTP ${status})"
        failed=1
      fi ;;
    401|403)
      echo "${label}: ACCESS_DENIED (HTTP ${status}; issuer not independently attested)" ;;
    200|206)
      echo "${label}: SECURITY_FAILURE_ANONYMOUS_CONTENT (HTTP ${status})"
      failed=1 ;;
    *)
      echo "${label}: UNVERIFIED_ORIGIN_REACHABLE (HTTP ${status})"
      failed=1 ;;
  esac
}
check "Private app" "/app/"
check "Private state" "/api/state"
check "Gym photo index" "/api/gym/photos"
check "Gym image (synthetic nonexistent record)" "/api/gym/photos/2000-01-01/frente/image"
check "Wardrobe source" "/api/objects"
check "Wardrobe image (synthetic nonexistent record)" "/api/objects/privacy-synthetic/image/processed?v=00000000-0000-4000-8000-000000000000"
check "Health vision" "/api/health/vision"

if [ "$failed" -ne 0 ]; then
  echo "Security verification failed: no anonymous origin content or non-Access fallthrough is permitted."
  exit 1
fi
echo "All checked private routes rejected anonymous requests. Review Cloudflare policy separately for issuer and route coverage."
