provider "aws" {
  region = "us-east-2"
  default_tags {
    tags = {
      Project     = "W7Capstone"
      Team        = "G5"
      Owner       = "ngokhoangnam4268@gmail.com"
      Environment = "hackathon"
    }
  }
}

# -----------------------------------------------------------------------------
# 1. DYNAMODB TABLES
# -----------------------------------------------------------------------------
# Bảng lưu trữ thông tin Workspaces/Tenants
resource "aws_dynamodb_table" "workspaces" {
  name         = "DocHub_Workspaces_G5"
  billing_mode = "PAY_PER_REQUEST" # Dùng On-demand để tối ưu $100 budget
  hash_key     = "workspace_id"

  attribute {
    name = "workspace_id"
    type = "S"
  }
}

# Bảng lưu trữ trạng thái các Documents (PENDING, INDEXING, READY, ERROR)
resource "aws_dynamodb_table" "documents" {
  name         = "DocHub_Documents_G5"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "document_id"

  attribute {
    name = "document_id"
    type = "S"
  }
}

# -----------------------------------------------------------------------------
# 2. S3 BUCKET
# -----------------------------------------------------------------------------
# Bucket dùng để lưu trữ file PDF và file metadata.json
resource "aws_s3_bucket" "dochub_data" {
  bucket_prefix = "dochub-data-" # Tự sinh hậu tố ngẫu nhiên để không trùng tên
  force_destroy = true           # Cho phép xóa sạch bucket khi chạy terraform destroy
}

# Cấu hình CORS cho bucket để Frontend (React/HTML) có thể upload trực tiếp qua Pre-signed URL
resource "aws_s3_bucket_cors_configuration" "dochub_data_cors" {
  bucket = aws_s3_bucket.dochub_data.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# -----------------------------------------------------------------------------
# 3. IAM ROLES (TỐI THIỂU CHO HÔM NAY)
# -----------------------------------------------------------------------------

# --- Role cho Lambda Functions ---
resource "aws_iam_role" "lambda_role" {
  name = "dochub-lambda-exec-role-g5"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["lambda.amazonaws.com", "ecs-tasks.amazonaws.com"]
        }
      }
    ]
  })
}

# Gắn quyền ghi log (Basic Execution) cho Lambda
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy cho Lambda được phép CRUD DynamoDB và ghi file lên S3
resource "aws_iam_policy" "lambda_app_policy" {
  name        = "dochub-lambda-app-policy-g5"
  description = "Cho phep Lambda truy cap DynamoDB va S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.workspaces.arn,
          aws_dynamodb_table.documents.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.dochub_data.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:StartIngestionJob",
          "bedrock:GetIngestionJob"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_app_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_app_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_ecs_exec_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- Role cho ECS Task (AI Backend) ---
resource "aws_iam_role" "ecs_task_role" {
  name = "dochub-ecs-task-role-g5"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Policy cho ECS được quyền gọi Bedrock và lấy file từ S3 (nếu cần xử lý thêm)
resource "aws_iam_policy" "ecs_bedrock_policy" {
  name        = "dochub-ecs-bedrock-policy-g5"
  description = "Cho phep ECS goi AWS Bedrock AI"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:RetrieveAndGenerate",
          "bedrock:Retrieve"
        ]
        Resource = "*" # Ở ngày thi, bạn có thể thay bằng ARN của Knowledge Base cụ thể
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.dochub_data.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_bedrock_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_bedrock_policy.arn
}

# --- Outputs ---
output "data_bucket_name" {
  description = "S3 bucket name for raw document files"
  value       = aws_s3_bucket.dochub_data.id
}

