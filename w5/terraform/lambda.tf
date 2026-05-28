# =============================================================================
# Lambda: KB Auto-Sync Function
# =============================================================================

resource "aws_iam_role" "lambda_kb_sync" {
  name = "${var.project_name}-kb-sync-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_kb_sync.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_kb_sync" {
  name = "kb-sync-permissions"
  role = aws_iam_role.lambda_kb_sync.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:StartIngestionJob", "bedrock:GetIngestionJob"]
        Resource = aws_bedrockagent_knowledge_base.main.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.knowledge_base.arn, "${aws_s3_bucket.knowledge_base.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.lambda_dlq.arn
      }
    ]
  })
}

resource "aws_lambda_function" "kb_auto_sync" {
  function_name = "${var.project_name}-kb-auto-sync-${var.environment}"
  role          = aws_iam_role.lambda_kb_sync.arn
  handler       = "kb_auto_sync_lambda.handler"
  runtime       = "python3.11"
  timeout                        = 60
  reserved_concurrent_executions = 2
  filename                       = "${path.module}/../backend/lambda/kb_auto_sync_lambda.zip"

  environment {
    variables = {
      BEDROCK_KB_ID = aws_bedrockagent_knowledge_base.main.id
      BEDROCK_DS_ID = aws_bedrockagent_data_source.s3.data_source_id
    }
  }

  tags = {
    Name        = "${var.project_name}-kb-auto-sync"
    Environment = var.environment
  }
}

# S3 trigger: sync KB when documents change
resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.kb_auto_sync.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.knowledge_base.arn
}

resource "aws_s3_bucket_notification" "kb_sync_trigger" {
  bucket = aws_s3_bucket.knowledge_base.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.kb_auto_sync.arn
    events              = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_prefix       = "knowledge_base/"
    filter_suffix       = ".md"
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}

# =============================================================================
# Serverless Scaling (Reserved Concurrency + Async DLQ)
# =============================================================================

resource "aws_lambda_function_event_invoke_config" "kb_sync" {
  function_name          = aws_lambda_function.kb_auto_sync.function_name
  maximum_retry_attempts = 0

  destination_config {
    on_failure {
      destination = aws_sqs_queue.lambda_dlq.arn
    }
  }
}

resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "${var.project_name}-kb-sync-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
  tags                      = { Name = "${var.project_name}-kb-sync-dlq" }
}
