output "vpc_id" {
  value = module.vpc.vpc_id
}
output "public_subnets" {
  value = module.vpc.public_subnets
}
output "private_subnets" {
  value = module.vpc.private_subnets
}
output "database_subnets" {
  value = module.vpc.database_subnets
}

output "app_tg_arn" {
  value = aws_lb_target_group.app_tg.arn
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.backend_api.api_endpoint
}

output "api_gateway_id" {
  value = aws_apigatewayv2_api.backend_api.id
}

output "api_gateway_execution_arn" {
  value = aws_apigatewayv2_api.backend_api.execution_arn
}
