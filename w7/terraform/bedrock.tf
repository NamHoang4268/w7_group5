# BEDROCK KNOWLEDGE BASE — S3 Vectors + Titan Text Embeddings V2
# Giải thích lựa chọn (QnA):
#   - S3 Vectors thay OpenSearch Serverless: tiết kiệm ~$27.65/48h (~0% vs 29% budget)
#   - Titan Text Embeddings V2: hoạt động tối ưu tại us-east-2, đáp ứng đầy đủ tính năng xử lý văn bản PDF.

data "aws_caller_identity" "current" {}

# --- IAM Role cho Bedrock Knowledge Base ---
resource "aws_iam_role" "bedrock_kb_role" {
  name = "dochub-ai-bedrock-kb-role-g5"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_kb_policy" {
  name = "dochub-ai-bedrock-kb-policy-g5"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Quyền gọi Nova Multimodal Embeddings để tạo vector
      {
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        # NOTE: Titan Text Embeddings V2 tại us-east-2
        Resource = "arn:aws:bedrock:us-east-2::foundation-model/amazon.titan-embed-text-v2:0"
      },
      # Quyền đọc file PDF từ S3 Data bucket (nguồn dữ liệu)
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.dochub_data.arn,
          "${aws_s3_bucket.dochub_data.arn}/*"
        ]
      },
      # Quyền đọc/ghi vector vào S3 Vectors bucket (lưu trữ embedding)
      {
        Effect = "Allow"
        Action = [
          "s3vectors:GetIndex",
          "s3vectors:GetVectors",
          "s3vectors:PutVectors",
          "s3vectors:DeleteVectors",
          "s3vectors:QueryVectors",
          "s3vectors:ListVectors"
        ]
        Resource = "*"
      }
    ]
  })
}

# --- S3 Vectors Bucket — Tạo thủ công qua Console (Terraform chưa hỗ trợ tạo S3 Vectors bucket) ---
# Chi phí: ~$0.01/48h vs OpenSearch Serverless ~$27.65/48h (tiết kiệm 99.96% chi phí storage)
# Bucket đã tạo sẵn tại: us-east-2, tên: dochub-vectors-g5
locals {
  vectors_bucket_arn  = "arn:aws:s3vectors:us-east-2:946232032779:bucket/dochub-vectors-g5"
  vectors_bucket_name = "dochub-vectors-g5"
}

# --- S3 Vectors Index — phải khai báo AMAZON_BEDROCK_TEXT và AMAZON_BEDROCK_METADATA
# là non-filterable để tránh lỗi "Filterable metadata must have at most 2048 bytes"
# Limit: filterable = 2KB, non-filterable = 40KB/vector
# QUAN TRỌNG: Index là immutable — nếu cần thay đổi phải xóa và tạo lại
resource "aws_s3vectors_index" "dochub_index" {
  vector_bucket_name = local.vectors_bucket_name
  index_name         = "dochub-vector-index"
  data_type          = "float32"
  dimension          = 1024  # Titan Text Embeddings V2 output dimension
  distance_metric    = "cosine"

  metadata_configuration {
    non_filterable_metadata_keys = [
      "AMAZON_BEDROCK_TEXT",
      "AMAZON_BEDROCK_METADATA",
    ]
  }
}

# --- Bedrock Knowledge Base ---
resource "aws_bedrockagent_knowledge_base" "dochub_kb" {
  name     = "dochub-ai-kb"
  role_arn = aws_iam_role.bedrock_kb_role.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      # Amazon Titan Text Embeddings V2 — Tối ưu chi phí và hiệu năng tại us-east-2
      embedding_model_arn = "arn:aws:bedrock:us-east-2::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }

  storage_configuration {
    type = "S3_VECTORS"
    s3_vectors_configuration {
      vector_bucket_arn = local.vectors_bucket_arn
      index_name        = "dochub-vector-index"
    }
  }

  depends_on = [aws_iam_role_policy.bedrock_kb_policy]
}

# --- Bedrock Data Source — Trỏ đến S3 bucket chứa file PDF của người dùng ---
resource "aws_bedrockagent_data_source" "dochub_ds" {
  name                 = "dochub-ai-s3-datasource"
  knowledge_base_id    = aws_bedrockagent_knowledge_base.dochub_kb.id
  data_deletion_policy = "RETAIN"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn             = aws_s3_bucket.dochub_data.arn
      # Chỉ index thư mục docs/ — path ngắn hơn để tránh lỗi metadata 2048 bytes của S3 Vectors
      inclusion_prefixes     = ["docs/"]
    }
  }
}

# --- Outputs ---
output "bedrock_kb_id" {
  description = "Bedrock Knowledge Base ID (dùng để cấu hình ECS + Lambda)"
  value       = aws_bedrockagent_knowledge_base.dochub_kb.id
}
