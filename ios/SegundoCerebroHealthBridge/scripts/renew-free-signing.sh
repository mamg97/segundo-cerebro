#!/bin/zsh
set -euo pipefail

export DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"

readonly DEVICE_ID="${HEALTH_BRIDGE_DEVICE_ID:?HEALTH_BRIDGE_DEVICE_ID is required}"
readonly TEAM_ID="${HEALTH_BRIDGE_TEAM_ID:?HEALTH_BRIDGE_TEAM_ID is required}"
readonly SCRIPT_DIR="${0:A:h}"
readonly PROJECT_DIR="${SCRIPT_DIR:h}"
readonly STATE_DIR="${HOME}/Library/Application Support/SegundoCerebroHealthBridge"
readonly DERIVED_DATA_DIR="${STATE_DIR}/DerivedData"
readonly LAST_ATTEMPT_FILE="${STATE_DIR}/free-signing-last-attempt"
readonly LAST_SUCCESS_FILE="${STATE_DIR}/free-signing-last-success"
readonly LAST_REVISION_FILE="${STATE_DIR}/free-signing-last-revision"
readonly LAST_ERROR_FILE="${STATE_DIR}/free-signing-last-error"
readonly MAX_SUCCESS_AGE_SECONDS=$((5 * 24 * 60 * 60))
readonly BUNDLE_ID="com.mamg97.segundocerebro.healthbridge"
readonly APP_PATH="${DERIVED_DATA_DIR}/Build/Products/Debug-iphoneos/SegundoCerebroHealthBridge.app"

mkdir -p "${STATE_DIR}"
date +%s > "${LAST_ATTEMPT_FILE}"

record_failure() {
  local exit_code=$?
  printf '%s exit=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${exit_code}" > "${LAST_ERROR_FILE}"
  exit "${exit_code}"
}
trap record_failure ERR

# Renew only a clean main checkout, advanced without rewriting local history.
readonly REPO_DIR="$(git -C "${PROJECT_DIR}" rev-parse --show-toplevel)"
if [[ "$(git -C "${REPO_DIR}" branch --show-current)" != "main" || -n "$(git -C "${REPO_DIR}" status --porcelain)" ]]; then
  echo "Renovación detenida: se requiere main limpio; se conservan todos los cambios locales."
  exit 2
fi
git -C "${REPO_DIR}" fetch --quiet origin main
git -C "${REPO_DIR}" merge --ff-only --quiet origin/main
readonly SOURCE_REVISION="$(git -C "${REPO_DIR}" rev-parse HEAD)"
readonly INSTALLED_REVISION="$(cat "${LAST_REVISION_FILE}" 2>/dev/null || true)"

if [[ "${1:-}" != "--force" && -f "${LAST_SUCCESS_FILE}" && "${INSTALLED_REVISION}" == "${SOURCE_REVISION}" ]]; then
  readonly last_success="$(<"${LAST_SUCCESS_FILE}")"
  readonly now="$(date +%s)"
  if [[ "${last_success}" == <-> ]] && (( now - last_success < MAX_SUCCESS_AGE_SECONDS )); then
    echo "La firma gratuita sigue dentro del margen de seguridad; no hace falta renovarla."
    exit 0
  fi
fi

echo "Renovando la firma gratuita de Health Bridge desde el proyecto actual..."

xcodebuild \
  -project "${PROJECT_DIR}/SegundoCerebroHealthBridge.xcodeproj" \
  -scheme SegundoCerebroHealthBridge \
  -configuration Debug \
  -destination "id=${DEVICE_ID}" \
  -derivedDataPath "${DERIVED_DATA_DIR}" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="${TEAM_ID}" \
  CODE_SIGN_STYLE=Automatic \
  HEALTH_BRIDGE_REVISION="${SOURCE_REVISION}" \
  build

xcrun devicectl device install app --device "${DEVICE_ID}" "${APP_PATH}"

# Reinstalar el mismo bundle conserva el token en Keychain y los permisos de Salud.
if ! xcrun devicectl device process launch --device "${DEVICE_ID}" "${BUNDLE_ID}"; then
  echo "La app quedó renovada, pero iOS no permitió abrirla en este momento."
fi

printf '%s\n' "${SOURCE_REVISION}" > "${LAST_REVISION_FILE}"
date +%s > "${LAST_SUCCESS_FILE}"
rm -f "${LAST_ERROR_FILE}"
echo "Firma gratuita renovada correctamente."
