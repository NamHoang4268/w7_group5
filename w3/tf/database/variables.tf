variable "proj_name" { type = string }

variable "database_subnets" {
  type = list(string)
}
variable "data_sg_id" {
  type = string
}
variable "db_username" {
  type = string
}
variable "db_password" {
  type      = string
  sensitive = true
}
