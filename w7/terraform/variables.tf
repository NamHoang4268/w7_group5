variable "bedrock_kb_id" {
  description = "Knowledge Base ID created on Console"
  type        = string
  default     = ""
}

variable "bedrock_ds_id" {
  description = "Data Source ID created on Console"
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Bedrock Model ID to use for inference"
  type        = string
  default     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}
