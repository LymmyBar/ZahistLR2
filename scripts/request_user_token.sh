#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/request_user_token.sh <username> <password> [output_file]

Requests a user access token using the Resource Owner Password grant type.
Requires AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE.
Optional AUTH0_SCOPE (defaults to "openid profile email offline_access").
USAGE
}

if [[ $# -lt 2 ]]; then
  usage >&2
  exit 1
fi

USERNAME=$1
PASSWORD=$2
OUTPUT_FILE=${3:-"artifacts/user_token.json"}
AUTH0_DOMAIN=${AUTH0_DOMAIN:-"dev-qpb2xt3kxhpqx4fk.us.auth0.com"}
AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID:-"I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH"}
AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET:-"Y6Irq8WpmGx7bLr-GGfzx1nJQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh"}
AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-"https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/"}
AUTH0_SCOPE=${AUTH0_SCOPE:-"openid profile email offline_access"}

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "[INFO] Requesting user token for ${USERNAME} from https://${AUTH0_DOMAIN}" >&2
RESPONSE=$(curl --silent --show-error --fail \
  --request POST \
  --url "https://${AUTH0_DOMAIN}/oauth/token" \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data "grant_type=password&username=${USERNAME}&password=${PASSWORD}&audience=${AUTH0_AUDIENCE}&scope=${AUTH0_SCOPE}&client_id=${AUTH0_CLIENT_ID}&client_secret=${AUTH0_CLIENT_SECRET}")

echo "$RESPONSE" | jq '.' > "$OUTPUT_FILE"

echo "[INFO] User token stored to ${OUTPUT_FILE}" >&2
