output "alb_sg_id" {
  value = aws_security_group.alb_sg.id
}
output "app_sg_id" {
  value = aws_security_group.app_sg.id
}
output "data_sg_id" {
  value = aws_security_group.data_sg.id
}

output "backend_secrets_arn" {
  value = aws_secretsmanager_secret.backend_secrets.arn
}
