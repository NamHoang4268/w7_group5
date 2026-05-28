output "lambda_function_arn" {
  value = aws_lambda_function.bedrock_chat.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.bedrock_chat.function_name
}
