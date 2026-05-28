# =============================================================================
# API Gateway: KB Sync Endpoint (Auth + Throttling)
# =============================================================================

resource "aws_api_gateway_rest_api" "sync" {
  name        = "${var.project_name}-sync-api"
  description = "API Gateway for GeekBrain KB sync Lambda"
  endpoint_configuration { types = ["REGIONAL"] }
  tags = { Name = "${var.project_name}-sync-api" }
}

resource "aws_api_gateway_resource" "sync" {
  rest_api_id = aws_api_gateway_rest_api.sync.id
  parent_id   = aws_api_gateway_rest_api.sync.root_resource_id
  path_part   = "sync"
}

resource "aws_api_gateway_method" "sync_post" {
  rest_api_id      = aws_api_gateway_rest_api.sync.id
  resource_id      = aws_api_gateway_resource.sync.id
  http_method      = "POST"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "sync_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.sync.id
  resource_id             = aws_api_gateway_resource.sync.id
  http_method             = aws_api_gateway_method.sync_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.kb_auto_sync.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.kb_auto_sync.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.sync.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "sync" {
  rest_api_id = aws_api_gateway_rest_api.sync.id
  depends_on  = [aws_api_gateway_integration.sync_lambda]
  lifecycle { create_before_destroy = true }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.sync.id
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  stage_name    = "prod"

  tags = { Name = "${var.project_name}-prod-stage" }
}

resource "aws_api_gateway_api_key" "sync" {
  name    = "${var.project_name}-api-key"
  enabled = true
}

resource "aws_api_gateway_usage_plan" "sync" {
  name = "${var.project_name}-sync-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.sync.id
    stage  = aws_api_gateway_stage.prod.stage_name
  }

  throttle_settings {
    rate_limit  = 10
    burst_limit = 20
  }

  quota_settings {
    limit  = 1000
    period = "DAY"
  }
}

resource "aws_api_gateway_usage_plan_key" "sync" {
  key_id        = aws_api_gateway_api_key.sync.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.sync.id
}
