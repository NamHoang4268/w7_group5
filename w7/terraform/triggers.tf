# -----------------------------------------------------------------------------
# 6. EVENT TRIGGERS — Nối dây S3 -> Lambda và EventBridge -> Lambda
# -----------------------------------------------------------------------------

# --- S3 Event Notification: Khi file upload xong, gọi event-handler-lambda ---
resource "aws_lambda_permission" "s3_invoke_event_handler" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.event_handler.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.dochub_data.arn
}

resource "aws_s3_bucket_notification" "dochub_data_notification" {
  bucket = aws_s3_bucket.dochub_data.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.event_handler.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.s3_invoke_event_handler]
}

# --- EventBridge Rule: Khi Bedrock Ingestion hoàn tất, gọi event-handler-lambda ---
resource "aws_cloudwatch_event_rule" "bedrock_ingestion" {
  name        = "dochub-bedrock-ingestion-status"
  description = "Capture Bedrock KB ingestion state changes"

  event_pattern = jsonencode({
    source      = ["aws.bedrock"]
    detail-type = ["Knowledge Base Ingestion State Change"]
  })
}

resource "aws_cloudwatch_event_target" "bedrock_to_lambda" {
  rule      = aws_cloudwatch_event_rule.bedrock_ingestion.name
  target_id = "EventHandlerLambda"
  arn       = aws_lambda_function.event_handler.arn
}

resource "aws_lambda_permission" "eventbridge_invoke_event_handler" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.event_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.bedrock_ingestion.arn
}
