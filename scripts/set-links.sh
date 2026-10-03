#!/usr/bin/env bash
# Fill in your GitHub and Ko-fi usernames everywhere (README, FUNDING, panel buttons).
#   ./scripts/set-links.sh <github-user> <kofi-user> [repo-name]
set -euo pipefail
cd "$(dirname "$0")/.."
GH="${1:?github user}"; KOFI="${2:?ko-fi user}"; REPO="${3:-spindeck}"
sed -i "s#YOUR_GITHUB/spindeck#${GH}/${REPO}#g; s#YOUR_KOFI_USERNAME#${KOFI}#g" README.md README.ko.md .github/FUNDING.yml
sed -i "s#^export const KOFI_URL = .*#export const KOFI_URL = \"https://ko-fi.com/${KOFI}\";#; s#^export const REPO_URL = .*#export const REPO_URL = \"https://github.com/${GH}/${REPO}\";#" src/links.ts
grep -n "URL =" src/links.ts
