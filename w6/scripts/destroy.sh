#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"

echo "=== W5 Network Fortress Teardown ==="
echo "WARNING: This will destroy ALL W5 infrastructure."
echo ""

cd "$TF_DIR"

read -p "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  terraform destroy -auto-approve
  echo "=== Teardown Complete ==="
else
  echo "Cancelled."
fi
