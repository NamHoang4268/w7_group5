output "s3_bucket_name" {
  description = "Name of the S3 bucket for knowledge base"
  value       = aws_s3_bucket.knowledge_base.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.knowledge_base.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.knowledge_base.region
}

output "uploaded_documents_count" {
  description = "Number of documents uploaded"
  value       = length(aws_s3_object.kb_documents)
}

output "uploaded_documents" {
  description = "List of uploaded document keys"
  value       = [for obj in aws_s3_object.kb_documents : obj.key]
}

# OpenSearch Serverless outputs
output "opensearch_collection_id" {
  description = "ID of the OpenSearch Serverless collection"
  value       = aws_opensearchserverless_collection.kb_vector_store.id
}

output "opensearch_collection_arn" {
  description = "ARN of the OpenSearch Serverless collection"
  value       = aws_opensearchserverless_collection.kb_vector_store.arn
}

output "opensearch_collection_endpoint" {
  description = "Endpoint of the OpenSearch Serverless collection"
  value       = aws_opensearchserverless_collection.kb_vector_store.collection_endpoint
}

# Bedrock Knowledge Base outputs
output "knowledge_base_id" {
  description = "ID of the Bedrock Knowledge Base"
  value       = aws_bedrockagent_knowledge_base.geekbrain_kb.id
}

output "knowledge_base_arn" {
  description = "ARN of the Bedrock Knowledge Base"
  value       = aws_bedrockagent_knowledge_base.geekbrain_kb.arn
}

output "knowledge_base_name" {
  description = "Name of the Bedrock Knowledge Base"
  value       = aws_bedrockagent_knowledge_base.geekbrain_kb.name
}

output "data_source_id" {
  description = "ID of the Bedrock Knowledge Base data source"
  value       = aws_bedrockagent_data_source.kb_s3_source.id
}

output "bedrock_kb_role_arn" {
  description = "ARN of the IAM role for Bedrock Knowledge Base"
  value       = aws_iam_role.bedrock_kb_role.arn
}

# Summary output
output "setup_summary" {
  description = "Summary of the Knowledge Base setup"
  value = {
    s3_bucket           = aws_s3_bucket.knowledge_base.id
    documents_uploaded  = length(aws_s3_object.kb_documents)
    opensearch_endpoint = aws_opensearchserverless_collection.kb_vector_store.collection_endpoint
    knowledge_base_id   = aws_bedrockagent_knowledge_base.geekbrain_kb.id
    embedding_model     = "amazon.titan-embed-text-v2:0"
    chunking_strategy   = "FIXED_SIZE: 300 tokens, 20% overlap"
  }
}

# DynamoDB outputs
output "dynamodb_table_name" {
  description = "Name of the DynamoDB conversations table"
  value       = aws_dynamodb_table.conversations.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB conversations table"
  value       = aws_dynamodb_table.conversations.arn
}

# Lambda outputs
output "lambda_function_arn" {
  description = "ARN of the KB auto-sync Lambda function"
  value       = aws_lambda_function.kb_auto_sync.arn
}

output "lambda_function_name" {
  description = "Name of the KB auto-sync Lambda function"
  value       = aws_lambda_function.kb_auto_sync.function_name
}

