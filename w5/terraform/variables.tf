variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "geekbrain"
}

variable "cloudfront_origin_secret" {
  description = "Shared secret header between CloudFront and ALB to prevent direct ALB access"
  type        = string
  sensitive   = true
  default     = "change-me-in-tfvars"
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "admin@example.com"
}

