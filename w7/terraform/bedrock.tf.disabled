data "aws_caller_identity" "current" {}

# --- IAM Role for Bedrock KB ---
resource "aws_iam_role" "bedrock_kb_role" {
  name = "dochub-ai-bedrock-kb-role"
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
  name = "dochub-ai-bedrock-kb-policy"
  role = aws_iam_role.bedrock_kb_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
      },
      {
        Effect = "Allow"
        Action = [
          "aoss:APIAccessAll"
        ]
        Resource = "arn:aws:aoss:us-east-1:${data.aws_caller_identity.current.account_id}:collection/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.dochub_data.arn, "${aws_s3_bucket.dochub_data.arn}/*"]
      }
    ]
  })
}

# --- OpenSearch Serverless Collection ---
resource "aws_opensearchserverless_security_policy" "kb_encryption" {
  name = "dochub-ai-kb-enc"
  type = "encryption"
  policy = jsonencode({
    Rules = [{
      ResourceType = "collection"
      Resource     = ["collection/dochub-ai-kb"]
    }]
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "kb_network" {
  name = "dochub-ai-kb-net"
  type = "network"
  policy = jsonencode([{
    Rules = [{
      ResourceType = "collection"
      Resource     = ["collection/dochub-ai-kb"]
      }, {
      ResourceType = "dashboard"
      Resource     = ["collection/dochub-ai-kb"]
    }]
    AllowFromPublic = true
  }])
}

resource "aws_opensearchserverless_access_policy" "kb_access" {
  name = "dochub-ai-kb-access"
  type = "data"
  policy = jsonencode([{
    Rules = [
      {
        ResourceType = "index"
        Resource     = ["index/dochub-ai-kb/*"]
        Permission   = ["aoss:CreateIndex", "aoss:DeleteIndex", "aoss:UpdateIndex", "aoss:DescribeIndex", "aoss:ReadDocument", "aoss:WriteDocument"]
      },
      {
        ResourceType = "collection"
        Resource     = ["collection/dochub-ai-kb"]
        Permission   = ["aoss:CreateCollectionItems", "aoss:DeleteCollectionItems", "aoss:UpdateCollectionItems", "aoss:DescribeCollectionItems"]
      }
    ]
    Principal = [
      aws_iam_role.bedrock_kb_role.arn,
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/Minh"
    ]
  }])
}

resource "aws_opensearchserverless_collection" "kb" {
  name = "dochub-ai-kb"
  type = "VECTORSEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.kb_encryption,
    aws_opensearchserverless_security_policy.kb_network,
    aws_opensearchserverless_access_policy.kb_access
  ]
}

# --- Bootstrap OpenSearch vector index ---
resource "null_resource" "create_oss_index" {
  provisioner "local-exec" {
    command = "python3 ${path.module}/scripts/create_oss_index.py"
    environment = {
      COLLECTION_ENDPOINT = aws_opensearchserverless_collection.kb.collection_endpoint
      INDEX_NAME          = "bedrock-kb-index"
      AWS_REGION          = "us-east-1"
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
resource "aws_bedrockagent_knowledge_base" "dochub_kb" {
  name     = "dochub-ai-kb"
  role_arn = aws_iam_role.bedrock_kb_role.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
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

  depends_on = [
    aws_iam_role_policy.bedrock_kb_policy,
    null_resource.create_oss_index
  ]
}

# --- Bedrock Data Source ---
resource "aws_bedrockagent_data_source" "dochub_ds" {
  name                 = "dochub-ai-s3-datasource"
  knowledge_base_id    = aws_bedrockagent_knowledge_base.dochub_kb.id
  data_deletion_policy = "RETAIN"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn = aws_s3_bucket.dochub_data.arn
    }
  }
}
