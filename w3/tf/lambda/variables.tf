variable "proj_name" { type = string }
variable "aws_region" { type = string }

variable "bedrock_kb_id" {
  description = "Bedrock Knowledge Base ID (created manually in console)"
  type        = string
}

variable "bedrock_model_arn" {
  description = "Bedrock model ARN for RetrieveAndGenerate (e.g. arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0)"
  type        = string
}

variable "api_gateway_id" {
  description = "Existing API Gateway HTTP API ID from compute module"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "Existing API Gateway execution ARN for Lambda permission"
  type        = string
}
