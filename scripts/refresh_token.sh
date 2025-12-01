#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/refresh_token.sh [refresh_token] [output_file]

If refresh_token is omitted, the script reads it from artifacts/user_token.json.
Requires AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE.
USAGE
}

REFRESH_TOKEN=${1:-}
OUTPUT_FILE=${2:-"artifacts/refresh_token.json"}
AUTH0_DOMAIN=${AUTH0_DOMAIN:-"dev-qpb2xt3kxhpqx4fk.us.auth0.com"}
AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID:-"I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH"}
AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET:-"Y6IRq8WpmGx7bLr-GGfzx1njQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh"}
AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-"https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/"}
TOKEN_SOURCE="artifacts/user_token.json"

if [[ -z "$REFRESH_TOKEN" ]]; then
  if [[ ! -f "$TOKEN_SOURCE" ]]; then
    echo "[ERROR] Refresh token not provided and ${TOKEN_SOURCE} is missing." >&2
    usage >&2
    exit 1
  fi
  REFRESH_TOKEN=$(jq -r '.refresh_token // empty' "$TOKEN_SOURCE")
  if [[ -z "$REFRESH_TOKEN" ]]; then
    echo "[ERROR] No refresh_token found inside ${TOKEN_SOURCE}." >&2
    exit 1
  fi
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "[INFO] Exchanging refresh token for new access token" >&2
RESPONSE=$(curl --silent --show-error --fail \
  --request POST \
  --url "https://${AUTH0_DOMAIN}/oauth/token" \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data "grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}&client_id=${AUTH0_CLIENT_ID}&client_secret=${AUTH0_CLIENT_SECRET}&audience=${AUTH0_AUDIENCE}")

echo "$RESPONSE" | jq '.' > "$OUTPUT_FILE"

echo "[INFO] New token stored to ${OUTPUT_FILE}" >&2
