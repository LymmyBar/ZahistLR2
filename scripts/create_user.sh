#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/create_user.sh <email> <password> [output_file]

Requires either AUTH0_MGMT_TOKEN env var or a token JSON file at artifacts/token.json
(created by scripts/request_token.sh). The script reads access_token from that file
when AUTH0_MGMT_TOKEN is unset.
USAGE
}

if [[ $# -lt 2 ]]; then
  usage >&2
  exit 1
fi

EMAIL=$1
PASSWORD=$2
OUTPUT_FILE=${3:-"artifacts/user_creation.json"}
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

echo "[INFO] Creating Auth0 user ${EMAIL} in ${AUTH0_DOMAIN}" >&2
RESPONSE=$(curl --silent --show-error --fail \
  --request POST \
  --url "https://${AUTH0_DOMAIN}/api/v2/users" \
  --header 'content-type: application/json' \
  --header "authorization: Bearer ${AUTH0_MGMT_TOKEN}" \
  --data @<(cat <<JSON
{
  "email": "${EMAIL}",
  "password": "${PASSWORD}",
  "connection": "${CONNECTION}",
  "email_verified": false,
  "verify_email": false
}
JSON
))

echo "$RESPONSE" | jq '.' > "$OUTPUT_FILE"

echo "[INFO] User creation response stored to ${OUTPUT_FILE}" >&2
