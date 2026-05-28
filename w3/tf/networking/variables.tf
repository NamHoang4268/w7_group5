variable "proj_name" { type = string }

variable "aws_region" { type = string }
variable "vpc_cidr" { type = string }
variable "vpc_azs" { type = list(string) }
# default = "10.0.0.0/16"
# default = ["us-east-1a", "us-east-1b"]

variable "alb_sg_id" { type = string }
