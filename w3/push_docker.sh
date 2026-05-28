#!/bin/bash
set -euo pipefail  # -u: lỗi nếu biến undefined, -o pipefail: lỗi trong pipe

REGION="us-east-1"  # ✅ đúng region
IMAGE_TAG=$(git rev-parse --short HEAD)  # ✅ version theo git commit
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)  # ✅ không phụ thuộc CWD

# Lấy ECR URL từ terraform output (source of truth)
ECR_REPO_URL=$(terraform -chdir="$SCRIPT_DIR" output -raw ecr_repository_url)

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Login, build, tag với SHA + latest, push
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URL

docker build -t "$ECR_REPO_URL:$IMAGE_TAG" -t "$ECR_REPO_URL:latest" \
  "$SCRIPT_DIR/5XRestaurant/server"

docker push "$ECR_REPO_URL:$IMAGE_TAG"
docker push "$ECR_REPO_URL:latest"

# Force ECS redeploy ngay sau khi push
aws ecs update-service \
  --cluster xrestaurant-dev-cluster \
  --service xrestaurant-dev-ecs-service \
  --force-new-deployment \
  --region $REGION > /dev/null

echo "✅ Pushed $IMAGE_TAG — ECS đang redeploy..."
