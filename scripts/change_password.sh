#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/change_password.sh <email> <new_password> [output_file]

Looks up the user_id by email and sets a new password using Auth0 Management API.
Requires a Management API token via AUTH0_MGMT_TOKEN or artifacts/token.json.
USAGE
}

if [[ $# -lt 2 ]]; then
  usage >&2
  exit 1
fi

EMAIL=$1
NEW_PASSWORD=$2
OUTPUT_FILE=${3:-"artifacts/password_change.json"}
AUTH0_DOMAIN=${AUTH0_DOMAIN:-"dev-qpb2xt3kxhpqx4fk.us.auth0.com"}
CONNECTION=${AUTH0_CONNECTION:-"Username-Password-Authentication"}
TOKEN_SOURCE=${AUTH0_TOKEN_FILE:-"artifacts/token.json"}

if [[ -z "${AUTH0_MGMT_TOKEN:-}" ]]; then
  if [[ ! -f "$TOKEN_SOURCE" ]]; then
    echo "[ERROR] AUTH0_MGMT_TOKEN not set and token file ${TOKEN_SOURCE} not found." >&2
    exit 1
  fi
  AUTH0_MGMT_TOKEN=$(jq -r '.access_token // empty' "$TOKEN_SOURCE")
  if [[ -z "$AUTH0_MGMT_TOKEN" ]]; then
    echo "[ERROR] access_token missing inside ${TOKEN_SOURCE}." >&2
    exit 1
  fi
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "[INFO] Looking up user_id for ${EMAIL}" >&2
USER_LOOKUP=$(curl --silent --show-error --fail \
  --request GET \
  --url "https://${AUTH0_DOMAIN}/api/v2/users-by-email" \
  --header 'content-type: application/json' \
  --header "authorization: Bearer ${AUTH0_MGMT_TOKEN}" \
  --get --data-urlencode "email=${EMAIL}")

USER_ID=$(echo "$USER_LOOKUP" | jq -r '.[0].user_id // empty')
if [[ -z "$USER_ID" ]]; then
  echo "[ERROR] Unable to resolve user_id for ${EMAIL}. Response: ${USER_LOOKUP}" >&2
  exit 1
fi

ENCODED_ID=$(python3 - <<PY
import urllib.parse
print(urllib.parse.quote("${USER_ID}", safe=''))
PY
)

echo "[INFO] Updating password for ${USER_ID}" >&2
RESPONSE=$(curl --silent --show-error --fail \
  --request PATCH \
  --url "https://${AUTH0_DOMAIN}/api/v2/users/${ENCODED_ID}" \
  --header 'content-type: application/json' \
  --header "authorization: Bearer ${AUTH0_MGMT_TOKEN}" \
  --data @<(cat <<JSON
{
  "password": "${NEW_PASSWORD}",
  "connection": "${CONNECTION}"
}
JSON
))

echo "$RESPONSE" | jq '.' > "$OUTPUT_FILE"

echo "[INFO] Password change response stored to ${OUTPUT_FILE}" >&2
