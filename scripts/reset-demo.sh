#!/usr/bin/env bash
# Put the demo back to its starting point: Flagsmith values reset, SwiftShip unjammed, fresh seeded orders.
# Run from the project root.
set -euo pipefail

cd "$(dirname "$0")/.."
kc() { kubectl --context orbstack "$@"; }

node scripts/flagsmith-setup.mjs
# A new pod gets a new emptyDir, so the persisted jam is gone. The control tower reseeds its orders on start.
kc -n pakka rollout restart deployment/swiftship deployment/control-tower
kc -n pakka rollout status deployment/swiftship --timeout=120s
kc -n pakka rollout status deployment/control-tower --timeout=120s
echo "Demo reset. UI: http://localhost:5173 (npm run dev in web/), API: http://localhost:30080"
