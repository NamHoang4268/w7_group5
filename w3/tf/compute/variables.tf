variable "proj_name" { type = string }

variable "vpc_id" { type = string }
variable "vpc_region" { type = string }
variable "private_subnets" { type = list(string) }
variable "app_sg_id" { type = string }
variable "app_tg_arn" { type = string }

variable "s3_bucket" { type = string }
variable "cdn_base_url" { type = string }


variable "backend_secrets_arn" { type = string }
variable "ecr_repository_url" { type = string }
