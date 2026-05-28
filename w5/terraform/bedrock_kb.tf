# =============================================================================
# S3: Knowledge Base Documents
# =============================================================================

resource "aws_s3_bucket" "knowledge_base" {
  bucket = "${var.project_name}-kb-${var.environment}"

  tags = {
    Name        = "${var.project_name}-kb"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "knowledge_base" {
  bucket = aws_s3_bucket.knowledge_base.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "knowledge_base" {
  bucket = aws_s3_bucket.knowledge_base.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "knowledge_base" {
  bucket                  = aws_s3_bucket.knowledge_base.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "knowledge_base_docs" {
  for_each = fileset("${path.module}/../backend/data_package/knowledge_base", "*.md")

  bucket       = aws_s3_bucket.knowledge_base.id
  key          = "knowledge_base/${each.value}"
  source       = "${path.module}/../backend/data_package/knowledge_base/${each.value}"
  etag         = filemd5("${path.module}/../backend/data_package/knowledge_base/${each.value}")
  content_type = "text/markdown"
}

# =============================================================================
# Bedrock Knowledge Base + OpenSearch Serverless (Vector Store)
# =============================================================================

# --- OpenSearch Serverless Collection ---

resource "aws_opensearchserverless_security_policy" "kb_encryption" {
  name = "${var.project_name}-kb-enc"
  type = "encryption"
  policy = jsonencode({
    Rules = [{
      ResourceType = "collection"
      Resource     = ["collection/${var.project_name}-kb"]
    }]
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "kb_network" {
  name = "${var.project_name}-kb-net"
  type = "network"
  policy = jsonencode([{
    Rules = [{
      ResourceType = "collection"
      Resource     = ["collection/${var.project_name}-kb"]
    }, {
      ResourceType = "dashboard"
      Resource     = ["collection/${var.project_name}-kb"]
    }]
    AllowFromPublic = true
  }])
}

resource "aws_opensearchserverless_access_policy" "kb_access" {
  name = "${var.project_name}-kb-access"
  type = "data"
  policy = jsonencode([{
    Rules = [
      {
        ResourceType = "index"
        Resource     = ["index/${var.project_name}-kb/*"]
        Permission   = ["aoss:CreateIndex", "aoss:DeleteIndex", "aoss:UpdateIndex", "aoss:DescribeIndex", "aoss:ReadDocument", "aoss:WriteDocument"]
      },
      {
        ResourceType = "collection"
        Resource     = ["collection/${var.project_name}-kb"]
        Permission   = ["aoss:CreateCollectionItems", "aoss:DeleteCollectionItems", "aoss:UpdateCollectionItems", "aoss:DescribeCollectionItems"]
      }
    ]
    Principal = [
      aws_iam_role.bedrock_kb.arn,
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/dangnhatminh"
    ]
  }])
}

resource "aws_opensearchserverless_collection" "kb" {
  name = "${var.project_name}-kb"
  type = "VECTORSEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.kb_encryption,
    aws_opensearchserverless_security_policy.kb_network,
    aws_opensearchserverless_access_policy.kb_access
  ]

  tags = {
    Name        = "${var.project_name}-kb-collection"
    Environment = var.environment
  }
}

# --- IAM Role for Bedrock KB ---

resource "aws_iam_role" "bedrock_kb" {
  name = "${var.project_name}-bedrock-kb-role"
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

resource "aws_iam_role_policy" "bedrock_kb" {
  name = "bedrock-kb-permissions"
  role = aws_iam_role.bedrock_kb.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
      },
      {
        Effect = "Allow"
        Action = [
          "aoss:APIAccessAll"
        ]
        Resource = "arn:aws:aoss:${var.aws_region}:${data.aws_caller_identity.current.account_id}:collection/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.knowledge_base.arn, "${aws_s3_bucket.knowledge_base.arn}/*"]
      }
    ]
  })
}

# --- Bootstrap OpenSearch vector index ---

resource "null_resource" "create_oss_index" {
  provisioner "local-exec" {
    command     = "python3 ${path.module}/scripts/create_oss_index.py"
    environment = {
      COLLECTION_ENDPOINT = aws_opensearchserverless_collection.kb.collection_endpoint
      INDEX_NAME          = "bedrock-kb-index"
      AWS_REGION          = var.aws_region
    }
  }

  triggers = {
    collection_id = aws_opensearchserverless_collection.kb.id
  }

  depends_on = [
    aws_opensearchserverless_collection.kb,
    aws_opensearchserverless_access_policy.kb_access
  ]
}

# --- Bedrock Knowledge Base ---

resource "aws_bedrockagent_knowledge_base" "main" {
  name     = "${var.project_name}-kb"
  role_arn = aws_iam_role.bedrock_kb.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.kb.arn
      vector_index_name = "bedrock-kb-index"
      field_mapping {
        vector_field   = "embedding"
        text_field     = "text"
        metadata_field = "metadata"
      }
    }
  }

  depends_on = [null_resource.create_oss_index]

  tags = {
    Name        = "${var.project_name}-kb"
    Environment = var.environment
  }
}

# --- Data Source (S3 bucket) ---

resource "aws_bedrockagent_data_source" "s3" {
  name                 = "${var.project_name}-kb-s3-source"
  knowledge_base_id    = aws_bedrockagent_knowledge_base.main.id
  data_deletion_policy = "RETAIN"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn = aws_s3_bucket.knowledge_base.arn
      inclusion_prefixes = ["knowledge_base/"]
    }
  }

}

# --- Update SSM Parameters with new KB/DS IDs ---

resource "aws_ssm_parameter" "bedrock_kb_id" {
  name      = "/geekbrain/BEDROCK_KB_ID"
  type      = "String"
  value     = aws_bedrockagent_knowledge_base.main.id
  overwrite = true
  tags      = { Name = "${var.project_name}-kb-id" }
}

resource "aws_ssm_parameter" "bedrock_ds_id" {
  name      = "/geekbrain/BEDROCK_DS_ID"
  type      = "String"
  value     = aws_bedrockagent_data_source.s3.data_source_id
  overwrite = true
  tags      = { Name = "${var.project_name}-ds-id" }
}

resource "aws_ssm_parameter" "bedrock_model_id" {
  name      = "/geekbrain/BEDROCK_MODEL_ID"
  type      = "String"
  value     = "us.anthropic.claude-sonnet-4-20250514-v1:0"
  overwrite = true
  tags      = { Name = "${var.project_name}-model-id" }
}

resource "aws_ssm_parameter" "dynamodb_table" {
  name      = "/geekbrain/DYNAMODB_TABLE"
  type      = "String"
  value     = aws_dynamodb_table.conversations.name
  overwrite = true
  tags      = { Name = "${var.project_name}-dynamodb-table" }
}

# --- Trigger initial ingestion ---

resource "null_resource" "initial_ingestion" {
  provisioner "local-exec" {
    command = "aws bedrock-agent start-ingestion-job --knowledge-base-id ${aws_bedrockagent_knowledge_base.main.id} --data-source-id ${aws_bedrockagent_data_source.s3.data_source_id} --region ${var.aws_region}"
  }

  triggers = {
    ds_id = aws_bedrockagent_data_source.s3.data_source_id
  }

  depends_on = [aws_bedrockagent_data_source.s3]
}
