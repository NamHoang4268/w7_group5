# -----------------------------------------------------------------------------
# 4. LAMBDA FUNCTIONS
# -----------------------------------------------------------------------------

# --- 1. API Handler Lambda ---
data "archive_file" "api_handler_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/api-handler-lambda"
  output_path = "${path.module}/api-handler.zip"
}

resource "aws_lambda_function" "api_handler" {
  function_name    = "dochub-api-handler"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.10"
  filename         = data.archive_file.api_handler_zip.output_path
  source_code_hash = data.archive_file.api_handler_zip.output_base64sha256
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      WORKSPACE_TABLE = aws_dynamodb_table.workspaces.name
      DOCUMENT_TABLE  = aws_dynamodb_table.documents.name
      S3_BUCKET       = aws_s3_bucket.dochub_data.id
    }
  }
}

# --- 2. Event Handler Lambda ---
data "archive_file" "event_handler_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/event-handler-lambda"
  output_path = "${path.module}/event-handler.zip"
}

resource "aws_lambda_function" "event_handler" {
  function_name    = "dochub-event-handler"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.10"
  filename         = data.archive_file.event_handler_zip.output_path
  source_code_hash = data.archive_file.event_handler_zip.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      DOCUMENT_TABLE = aws_dynamodb_table.documents.name
      S3_BUCKET      = aws_s3_bucket.dochub_data.id
      BEDROCK_KB_ID  = aws_bedrockagent_knowledge_base.dochub_kb.id
      BEDROCK_DS_ID  = aws_bedrockagent_data_source.dochub_ds.data_source_id
    }
  }
}
