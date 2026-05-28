#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
TF_DIR="$REPO_ROOT/terraform"
LAMBDA_DIR="$REPO_ROOT/lambda"

echo "=== W6 Operations Hardening Deployment ==="
echo ""

# ── Step 1: Build Lambda ZIPs ──────────────────────────────────────────────
echo "[1/4] Building Lambda deployment packages..."

cd "$LAMBDA_DIR"

zip -r kb_auto_sync_lambda.zip    kb_auto_sync_lambda.py
zip    cost_guard_lambda.zip      cost_guard_lambda.py
zip    security_guard_lambda.zip  security_guard_lambda.py

echo "      ✅ Lambda ZIPs ready"
echo ""

# ── Step 2: Terraform Init ─────────────────────────────────────────────────
cd "$TF_DIR"

echo "[2/4] Initializing Terraform..."
terraform init -upgrade

echo ""

# ── Step 3: Plan ───────────────────────────────────────────────────────────
echo "[3/4] Planning..."
terraform plan -out=tfplan

echo ""

# ── Step 4: Apply (with confirmation) ─────────────────────────────────────
read -p "Apply? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  echo "[4/4] Applying..."
  terraform apply tfplan
  echo ""
  echo "=== ✅ W6 Deployment Complete ==="
  echo ""
  terraform output
else
  echo "Cancelled."
fi
