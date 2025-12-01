#!/usr/bin/env bash
set -euo pipefail

# Default configuration can be overridden via environment variables
AUTH0_DOMAIN=${AUTH0_DOMAIN:-"dev-qpb2xt3kxhpqx4fk.us.auth0.com"}
AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID:-"I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH"}
AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET:-"Y6Irq8WpmGx7bLr-GGfzx1nJQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh"}
AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-"https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/"}
OUTPUT_FILE=${1:-"artifacts/token.json"}

if [[ -z "$AUTH0_DOMAIN" || -z "$AUTH0_CLIENT_ID" || -z "$AUTH0_CLIENT_SECRET" || -z "$AUTH0_AUDIENCE" ]]; then
  echo "[ERROR] One or more Auth0 variables are empty. Check AUTH0_* env vars." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

REQUEST_PAYLOAD=$(jq -n \
  --arg audience "$AUTH0_AUDIENCE" \
  --arg client_id "$AUTH0_CLIENT_ID" \
  --arg client_secret "$AUTH0_CLIENT_SECRET" \
  '{audience:$audience, grant_type:"client_credentials", client_id:$client_id, client_secret:$client_secret}')

echo "[INFO] Requesting client_credentials token from https://${AUTH0_DOMAIN}" >&2
RESPONSE=$(curl --silent --show-error --fail \
  --request POST \
  --url "https://${AUTH0_DOMAIN}/oauth/token" \
  --header 'content-type: application/json' \
  --data "$REQUEST_PAYLOAD")

echo "$RESPONSE" | jq '.' > "$OUTPUT_FILE"

ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token // empty')
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "[ERROR] access_token was not found in the response. Inspect ${OUTPUT_FILE}." >&2
  exit 1
fi

echo "[INFO] Token stored to ${OUTPUT_FILE}" >&2
