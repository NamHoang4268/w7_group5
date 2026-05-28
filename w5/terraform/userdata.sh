#!/bin/bash
set -ex

# Install dependencies
dnf install -y python3.11 python3.11-pip nfs-utils nodejs npm git

# Mount EFS
mkdir -p /mnt/efs
mount -t nfs4 -o nfsvers=4.1 ${efs_dns}:/ /mnt/efs
echo "${efs_dns}:/ /mnt/efs nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 0 0" >> /etc/fstab

# Sync knowledge base documents from S3 to EFS
mkdir -p /mnt/efs/knowledge_base
aws s3 sync s3://${s3_bucket}/knowledge_base/ /mnt/efs/knowledge_base/ --region ${aws_region}

# Create app directory
mkdir -p /opt/geekbrain
cd /opt/geekbrain

# Copy application code (pre-packaged in AMI or pulled from S3)
aws s3 cp s3://${s3_bucket}/app/backend.tar.gz /tmp/backend.tar.gz --region ${aws_region} || true
if [ -f /tmp/backend.tar.gz ]; then
  tar -xzf /tmp/backend.tar.gz -C /opt/geekbrain/
fi

# Install Python dependencies
if [ -f /opt/geekbrain/requirements.txt ]; then
  pip3.11 install -r /opt/geekbrain/requirements.txt
fi

# Create systemd service for FastAPI backend
cat > /etc/systemd/system/geekbrain-backend.service << 'EOF'
[Unit]
Description=GeekBrain FastAPI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/geekbrain
Environment=AWS_DEFAULT_REGION=${aws_region}
Environment=EFS_KNOWLEDGE_BASE_PATH=/mnt/efs/knowledge_base
ExecStart=/usr/bin/python3.11 -m uvicorn src.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start backend service
systemctl daemon-reload
systemctl enable geekbrain-backend
systemctl start geekbrain-backend

# Build and serve frontend
aws s3 cp s3://${s3_bucket}/app/frontend.tar.gz /tmp/frontend.tar.gz --region ${aws_region} || true
if [ -f /tmp/frontend.tar.gz ]; then
  tar -xzf /tmp/frontend.tar.gz -C /opt/geekbrain/frontend/
  cd /opt/geekbrain/frontend
  npm install
  npm run build
fi

# Install and configure nginx for frontend
dnf install -y nginx
cat > /etc/nginx/conf.d/geekbrain.conf << 'EOF'
server {
    listen 5173;
    root /opt/geekbrain/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

systemctl enable nginx
systemctl start nginx

echo "GeekBrain deployment complete" > /var/log/geekbrain-deploy.log
