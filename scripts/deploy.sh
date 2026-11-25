#!/usr/bin/env bash
# Build the Pakka images and deploy them to OrbStack's Kubernetes. Run from the project root.
set -euo pipefail

cd "$(dirname "$0")/.."
kc() { kubectl --context orbstack "$@"; }

SECRET_KEYS=(FLAGSMITH_MASTER_API_KEY SARVAM_API_KEY AZURE_ANTHROPIC_ENDPOINT AZURE_ANTHROPIC_KEY)
DEPLOYMENTS=(swiftship dakexpress)
MANIFESTS=(k8s/00-namespace.yaml k8s/10-couriers.yaml)

echo "==> building pakka/courier-mock:dev"
docker build -q -t pakka/courier-mock:dev services/courier-mock

if [[ ! -f services/control-tower/Dockerfile ]]; then
  echo "WARNING: services/control-tower/Dockerfile not found; deploying the couriers only" >&2
elif ! { echo "==> building pakka/control-tower:dev"; docker build -q -t pakka/control-tower:dev services/control-tower; }; then
  echo "WARNING: control-tower image failed to build; deploying the couriers only" >&2
else
  DEPLOYMENTS+=(control-tower)
  MANIFESTS+=(k8s/20-control-tower.yaml)
fi

echo "==> applying namespace"
kc apply -f k8s/00-namespace.yaml

# The secret values never touch argv, stdout or disk: they are read in a subshell and handed to
# kubectl through a process-substitution env file. Only the key names are printed.
echo "==> refreshing secret pakka-secrets"
(
  set -a
  for f in ./.env ./flagsmith/.local-admin.env; do
    # shellcheck disable=SC1090
    [[ -f "$f" ]] && source "$f"
  done
  set +a
  present=()
  for k in "${SECRET_KEYS[@]}"; do
    [[ -n "${!k:-}" ]] && present+=("$k")
  done
  echo "    keys set: ${present[*]:-none}"
  kc -n pakka create secret generic pakka-secrets \
    --from-env-file=<(for k in ${present[@]+"${present[@]}"}; do printf '%s=%s\n' "$k" "${!k}"; done) \
    --dry-run=client -o yaml | kc apply -f - >/dev/null
)

echo "==> applying manifests"
for m in "${MANIFESTS[@]}"; do kc apply -f "$m"; done

echo "==> restarting and waiting for rollout"
for d in "${DEPLOYMENTS[@]}"; do kc -n pakka rollout restart "deployment/$d"; done
for d in "${DEPLOYMENTS[@]}"; do kc -n pakka rollout status "deployment/$d" --timeout=120s; done

kc -n pakka get pods,svc
if [[ " ${DEPLOYMENTS[*]} " == *" control-tower "* ]]; then
  echo "Control tower: http://localhost:30080"
fi
