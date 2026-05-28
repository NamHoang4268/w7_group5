# ==========================================
# S3 Bucket for Knowledge Base Documents
# ==========================================

resource "aws_s3_bucket" "knowledge_base" {
  bucket_prefix = "${var.proj_name}-kb-"
  
  tags = {
    Name        = "${var.proj_name}-knowledge-base"
    Environment = var.environment
    Purpose     = "Bedrock Knowledge Base Documents"
  }
}

# Enable versioning for document history
resource "aws_s3_bucket_versioning" "kb_versioning" {
  bucket = aws_s3_bucket.knowledge_base.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "kb_encryption" {
  bucket = aws_s3_bucket.knowledge_base.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "kb_public_access" {
  bucket = aws_s3_bucket.knowledge_base.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Upload all 36 markdown documents
resource "aws_s3_object" "kb_documents" {
  for_each = fileset("${path.module}/../../xbrain-learners/W4/data_package/knowledge_base", "*.md")

  bucket       = aws_s3_bucket.knowledge_base.id
  key          = each.value
  source       = "${path.module}/../../xbrain-learners/W4/data_package/knowledge_base/${each.value}"
  etag         = filemd5("${path.module}/../../xbrain-learners/W4/data_package/knowledge_base/${each.value}")
  content_type = "text/markdown"

  tags = {
    Name = each.value
  }
}

# ==========================================
# OpenSearch Serverless Collection
# ==========================================

# Encryption policy for OpenSearch Serverless
resource "aws_opensearchserverless_security_policy" "encryption" {
  name = "${var.proj_name}-kb-encryption"
  type = "encryption"
  
  policy = jsonencode({
    Rules = [
      {
        Resource = [
          "collection/${var.proj_name}-kb-vectors"
        ]
        ResourceType = "collection"
      }
    ]
    AWSOwnedKey = true
  })
}

# Network policy for OpenSearch Serverless
resource "aws_opensearchserverless_security_policy" "network" {
  name = "${var.proj_name}-kb-network"
  type = "network"
  
  policy = jsonencode([
    {
      Rules = [
        {
          Resource = [
            "collection/${var.proj_name}-kb-vectors"
          ]
          ResourceType = "collection"
        }
      ]
      AllowFromPublic = true
    }
  ])
}

# Data access policy for OpenSearch Serverless
resource "aws_opensearchserverless_access_policy" "data_access" {
  name = "${var.proj_name}-kb-data-access"
  type = "data"
  
  policy = jsonencode([
    {
      Rules = [
        {
          Resource = [
            "collection/${var.proj_name}-kb-vectors"
          ]
          Permission = [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems",
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ]
          ResourceType = "collection"
        },
        {
          Resource = [
            "index/${var.proj_name}-kb-vectors/*"
          ]
          Permission = [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ]
          ResourceType = "index"
        }
      ]
      Principal = [
        aws_iam_role.bedrock_kb_role.arn
      ]
    }
  ])
}

# OpenSearch Serverless Collection
resource "aws_opensearchserverless_collection" "kb_vectors" {
  name = "${var.proj_name}-kb-vectors"
  type = "VECTORSEARCH"

  tags = {
    Name        = "${var.proj_name}-kb-vectors"
    Environment = var.environment
    Purpose     = "Bedrock Knowledge Base Vector Store"
  }

  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network
  ]
}

# ==========================================
# IAM Role for Bedrock Knowledge Base
# ==========================================

resource "aws_iam_role" "bedrock_kb_role" {
  name = "${var.proj_name}-bedrock-kb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.proj_name}-bedrock-kb-role"
  }
}

# Policy for S3 access
resource "aws_iam_role_policy" "bedrock_kb_s3" {
  name = "${var.proj_name}-bedrock-kb-s3"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.knowledge_base.arn,
          "${aws_s3_bucket.knowledge_base.arn}/*"
        ]
        Condition = {
          StringEquals = {
            "aws:PrincipalAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Policy for OpenSearch Serverless access
resource "aws_iam_role_policy" "bedrock_kb_aoss" {
  name = "${var.proj_name}-bedrock-kb-aoss"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "aoss:APIAccessAll"
        ]
        Effect = "Allow"
        Resource = aws_opensearchserverless_collection.kb_vectors.arn
      }
    ]
  })
}

# Policy for Bedrock model access (embeddings)
resource "aws_iam_role_policy" "bedrock_kb_model" {
  name = "${var.proj_name}-bedrock-kb-model"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:InvokeModel"
        ]
        Effect = "Allow"
        Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
      }
    ]
  })
}

# ==========================================
# Bedrock Knowledge Base
# ==========================================

resource "aws_bedrockagent_knowledge_base" "geekbrain_kb" {
  name     = "${var.proj_name}-knowledge-base"
  role_arn = aws_iam_role.bedrock_kb_role.arn
  
  description = "GeekBrain AI System Knowledge Base - 36 markdown documents about company info, policies, and postmortems"

  knowledge_base_configuration {
    type = "VECTOR"
    
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    
    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.kb_vectors.arn
      vector_index_name = "bedrock-knowledge-base-default-index"
      
      field_mapping {
        vector_field   = "bedrock-knowledge-base-default-vector"
        text_field     = "AMAZON_BEDROCK_TEXT_CHUNK"
        metadata_field = "AMAZON_BEDROCK_METADATA"
      }
    }
  }

  tags = {
    Name        = "${var.proj_name}-knowledge-base"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy.bedrock_kb_s3,
    aws_iam_role_policy.bedrock_kb_aoss,
    aws_iam_role_policy.bedrock_kb_model,
    aws_opensearchserverless_access_policy.data_access
  ]
}

# ==========================================
# Bedrock Knowledge Base Data Source
# ==========================================

resource "aws_bedrockagent_data_source" "s3_data_source" {
  name              = "${var.proj_name}-kb-s3-source"
  knowledge_base_id = aws_bedrockagent_knowledge_base.geekbrain_kb.id
  
  description = "S3 data source containing 36 markdown documents"

  data_source_configuration {
    type = "S3"
    
    s3_configuration {
      bucket_arn = aws_s3_bucket.knowledge_base.arn
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      
      fixed_size_chunking_configuration {
        max_tokens         = 300
        overlap_percentage = 20
      }
    }
  }

  depends_on = [
    aws_s3_object.kb_documents
  ]
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}
