# ==========================================
# LAMBDA — Bedrock RAG Chat Function
# ==========================================

# Archive the Lambda source code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}

# IAM Role for Lambda execution
resource "aws_iam_role" "lambda_role" {
  name = "${var.proj_name}-bedrock-chat-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs policy — scoped to this function's log group only
resource "aws_iam_role_policy" "lambda_logs" {
  name = "${var.proj_name}-lambda-logs"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "${aws_cloudwatch_log_group.lambda_logs.arn}:*"
      }
    ]
  })
}

# Bedrock policy — scoped to the specific Knowledge Base
resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "${var.proj_name}-lambda-bedrock"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:RetrieveAndGenerate",
          "bedrock:Retrieve"
        ]
        Effect = "Allow"
        Resource = "arn:aws:bedrock:${var.aws_region}:*:knowledge-base/${var.bedrock_kb_id}"
      },
      {
        Action = [
          "bedrock:InvokeModel"
        ]
        Effect   = "Allow"
        Resource = var.bedrock_model_arn
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.proj_name}-bedrock-chat"
  retention_in_days = 7
}

# Lambda Function
resource "aws_lambda_function" "bedrock_chat" {
  function_name    = "${var.proj_name}-bedrock-chat"
  description      = "AI Chat using Bedrock Knowledge Base RAG for EatEase Restaurant"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      BEDROCK_KB_ID    = var.bedrock_kb_id
      BEDROCK_MODEL_ARN = var.bedrock_model_arn
      AWS_REGION_NAME  = var.aws_region
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}

# ==========================================
# API GATEWAY Integration (reuse existing)
# ==========================================

# Lambda integration for the existing API Gateway
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.bedrock_chat.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route: POST /api/bedrock-chat
resource "aws_apigatewayv2_route" "bedrock_chat_route" {
  api_id    = var.api_gateway_id
  route_key = "POST /api/bedrock-chat"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Allow API Gateway to invoke the Lambda
resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bedrock_chat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*/api/bedrock-chat"
}
