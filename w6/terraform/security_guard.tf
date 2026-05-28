# =============================================================================
# MH-SEC: Self-Healing Security Guard
# Components:
#   - Lambda: detects S3 public access violations and open-SSH SG rules
#   - EventBridge rule: near real-time trigger on CloudTrail API events
#   - EventBridge Scheduler: daily cron fallback sweep
#   - KMS CMK: preventive control on S3 knowledge base bucket (Path A)
# =============================================================================

# -----------------------------------------------------------------------------
# IAM Role for Security Guard Lambda (least-privilege)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "security_guard" {
  name = "${var.project_name}-security-guard-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-security-guard-role" }
}

resource "aws_iam_role_policy_attachment" "security_guard_basic" {
  role       = aws_iam_role.security_guard.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "security_guard" {
  name = "security-guard-least-privilege"
  role = aws_iam_role.security_guard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3PublicAccessBlock"
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets",
          "s3:GetBucketPublicAccessBlock",
          "s3:PutBucketPublicAccessBlock",
          "s3:GetBucketPolicyStatus",
          "s3:GetBucketAcl"
        ]
        Resource = "*"
      },
      {
        Sid    = "SGRemediation"
        Effect = "Allow"
        Action = [
          "ec2:DescribeSecurityGroups",
          "ec2:RevokeSecurityGroupIngress"
        ]
        Resource = "*"
      },
      {
        Sid      = "PutCustomMetrics"
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Security Guard Lambda
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "security_guard" {
  function_name = "${var.project_name}-security-guard-${var.environment}"
  role          = aws_iam_role.security_guard.arn
  handler       = "security_guard_lambda.handler"
  runtime       = "python3.11"
  timeout       = 120

  filename = "${path.module}/../lambda/security_guard_lambda.zip"

  tags = { Name = "${var.project_name}-security-guard" }
}

resource "aws_cloudwatch_log_group" "security_guard" {
  name              = "/aws/lambda/${aws_lambda_function.security_guard.function_name}"
  retention_in_days = 7

  tags = { Name = "${var.project_name}-security-guard-logs" }
}

# -----------------------------------------------------------------------------
# EventBridge Rule: near real-time trigger on CloudTrail S3 / SG API events
# -----------------------------------------------------------------------------

# CloudTrail must be enabled in account for this to fire
resource "aws_cloudwatch_event_rule" "security_violations" {
  name        = "${var.project_name}-security-violations"
  description = "MH-SEC: Detect S3 public-access disable or SG open-ingress events via CloudTrail"

  event_pattern = jsonencode({
    source      = ["aws.s3", "aws.ec2"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = [
        "DeletePublicAccessBlock",
        "PutBucketPolicy",
        "PutBucketAcl",
        "AuthorizeSecurityGroupIngress"
      ]
    }
  })

  tags = { Name = "${var.project_name}-security-event-rule" }
}

resource "aws_cloudwatch_event_target" "security_guard_lambda" {
  rule = aws_cloudwatch_event_rule.security_violations.name
  arn  = aws_lambda_function.security_guard.arn
}

resource "aws_lambda_permission" "eventbridge_security_guard" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.security_guard.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.security_violations.arn
}

# -----------------------------------------------------------------------------
# EventBridge Scheduler: daily cron fallback sweep (same mechanism as Cost Guard)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "eventbridge_security_guard" {
  name = "${var.project_name}-eb-security-guard-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-eb-security-guard-role" }
}

resource "aws_iam_role_policy" "eventbridge_security_guard" {
  name = "invoke-security-guard-lambda"
  role = aws_iam_role.eventbridge_security_guard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.security_guard.arn
    }]
  })
}

resource "aws_scheduler_schedule" "security_guard_daily" {
  name                         = "${var.project_name}-security-guard-daily"
  description                  = "MH-SEC: Daily security sweep fallback at 21:00 UTC"
  schedule_expression          = "cron(0 21 * * ? *)"
  schedule_expression_timezone = "UTC"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.security_guard.arn
    role_arn = aws_iam_role.eventbridge_security_guard.arn

    input = jsonencode({ source = "scheduled-daily-security-sweep" })
  }
}

# -----------------------------------------------------------------------------
# Supporting Preventive Control — Path A: KMS CMK on S3 Knowledge Base
# Security-cost trade-off: CMK costs $1/month per key.
# Justified because KB documents are proprietary content — CMK gives us
# per-principal audit trail via CloudTrail kms:GenerateDataKey events,
# which is required for data governance compliance.
# -----------------------------------------------------------------------------

resource "aws_kms_key" "s3_kb" {
  description             = "CMK for GeekBrain KB S3 bucket — audit trail per decrypt"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRootFullAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowS3ServiceUse"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowBedrockKBUse"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.bedrock_kb.arn
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowECSTaskUse"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_task.arn
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })

  tags = { Name = "${var.project_name}-s3-kb-cmk" }
}

resource "aws_kms_alias" "s3_kb" {
  name          = "alias/${var.project_name}-s3-kb-prod"
  target_key_id = aws_kms_key.s3_kb.key_id
}

# Apply CMK to the S3 KB bucket (replaces default AES256 SSE)
resource "aws_s3_bucket_server_side_encryption_configuration" "knowledge_base_cmk" {
  bucket = aws_s3_bucket.knowledge_base.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3_kb.arn
    }
    bucket_key_enabled = true
  }
}

# CloudWatch alarm on Security Guard remediations
resource "aws_cloudwatch_metric_alarm" "security_guard_remediations" {
  alarm_name          = "${var.project_name}-security-guard-remediations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RemediationsApplied"
  namespace           = "GeekBrain/SecurityGuard"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Security Guard applied at least one remediation — review CloudTrail"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "${var.project_name}-security-guard-alarm" }
}
