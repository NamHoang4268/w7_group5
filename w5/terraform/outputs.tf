# =============================================================================
# Outputs
# =============================================================================

# --- Networking ---
output "app_vpc_id" {
  value = aws_vpc.app.id
}

output "data_vpc_id" {
  value = aws_vpc.data.id
}

output "vpc_peering_id" {
  value = aws_vpc_peering_connection.app_to_data.id
}

# --- ECS / ALB ---
output "alb_dns_name" {
  description = "Backend ALB URL (restricted to CloudFront only)"
  value       = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}


# --- EFS ---
output "efs_filesystem_id" {
  value = aws_efs_file_system.app.id
}

# --- Frontend ---
output "frontend_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

# --- API Gateway ---
output "api_gateway_url" {
  value = "${aws_api_gateway_stage.prod.invoke_url}/sync"
}

output "api_key_value" {
  value     = aws_api_gateway_api_key.sync.value
  sensitive = true
}

# --- Lambda / Scaling ---
output "dlq_url" {
  value = aws_sqs_queue.lambda_dlq.url
}


# --- Backup ---
output "backup_vault_name" {
  value = aws_backup_vault.main.name
}

# --- Flow Logs ---
output "flow_log_group_app" {
  value = aws_cloudwatch_log_group.flow_logs_app.name
}

output "flow_log_group_data" {
  value = aws_cloudwatch_log_group.flow_logs_data.name
}

# --- Monitoring ---
output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

# --- WAF ---
output "waf_web_acl_arn" {
  value = aws_wafv2_web_acl.cloudfront.arn
}

# --- Bedrock KB ---
output "bedrock_kb_id" {
  value = aws_bedrockagent_knowledge_base.main.id
}

output "bedrock_ds_id" {
  value = aws_bedrockagent_data_source.s3.data_source_id
}

output "opensearch_collection_endpoint" {
  value = aws_opensearchserverless_collection.kb.collection_endpoint
}
