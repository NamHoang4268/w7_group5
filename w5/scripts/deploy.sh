#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"

echo "=== W5 Network Fortress Deployment ==="
echo ""

cd "$TF_DIR"

echo "[1/3] Initializing Terraform..."
terraform init

echo ""
echo "[2/3] Planning..."
terraform plan -out=tfplan

echo ""
read -p "Apply? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  echo "[3/3] Applying..."
  terraform apply tfplan
  echo ""
  echo "=== Deployment Complete ==="
  echo ""
  terraform output
else
  echo "Cancelled."
fi
