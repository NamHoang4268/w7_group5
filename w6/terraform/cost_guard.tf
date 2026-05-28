# =============================================================================
# MH-COST-A: Automated Cost Guard
# Components:
#   (a) Lambda that stops untagged EC2 / ECS tasks
#   (b) EventBridge Scheduler — daily cron @ 20:00 UTC
#   (c) CloudTrail-based trigger not needed for Cost Guard; scheduled is primary
#   (d) AWS Budgets $150 → SNS → same Lambda
# =============================================================================

# -----------------------------------------------------------------------------
# IAM Role for Cost Guard Lambda (least-privilege)
# -----------------------------------------------------------------------------

resource "aws_iam_role" "cost_guard" {
  name = "${var.project_name}-cost-guard-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-cost-guard-role" }
}

resource "aws_iam_role_policy_attachment" "cost_guard_basic" {
  role       = aws_iam_role.cost_guard.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cost_guard" {
  name = "cost-guard-least-privilege"
  role = aws_iam_role.cost_guard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "StopEC2"
        Effect   = "Allow"
        Action   = ["ec2:StopInstances", "ec2:DescribeInstances"]
        Resource = "*"
      },
      {
        Sid      = "StopECSTasks"
        Effect   = "Allow"
        Action   = ["ecs:ListClusters", "ecs:ListTasks", "ecs:DescribeTasks", "ecs:StopTask"]
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
# (a) Cost Guard Lambda
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "cost_guard" {
  function_name = "${var.project_name}-cost-guard-${var.environment}"
  role          = aws_iam_role.cost_guard.arn
  handler       = "cost_guard_lambda.handler"
  runtime       = "python3.11"
  timeout       = 120

  filename = "${path.module}/../lambda/cost_guard_lambda.zip"

  tags = { Name = "${var.project_name}-cost-guard" }
}

resource "aws_cloudwatch_log_group" "cost_guard" {
  name              = "/aws/lambda/${aws_lambda_function.cost_guard.function_name}"
  retention_in_days = 7

  tags = { Name = "${var.project_name}-cost-guard-logs" }
}

# -----------------------------------------------------------------------------
# (b) EventBridge Scheduler — daily cron @ 20:00 UTC
# -----------------------------------------------------------------------------

resource "aws_iam_role" "eventbridge_cost_guard" {
  name = "${var.project_name}-eb-cost-guard-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-eb-cost-guard-role" }
}

resource "aws_iam_role_policy" "eventbridge_cost_guard" {
  name = "invoke-cost-guard-lambda"
  role = aws_iam_role.eventbridge_cost_guard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.cost_guard.arn
    }]
  })
}

resource "aws_scheduler_schedule" "cost_guard_daily" {
  name                         = "${var.project_name}-cost-guard-daily"
  description                  = "MH-COST-A: Daily cost guard sweep at 20:00 UTC"
  schedule_expression          = "cron(0 20 * * ? *)"
  schedule_expression_timezone = "UTC"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.cost_guard.arn
    role_arn = aws_iam_role.eventbridge_cost_guard.arn

    input = jsonencode({ source = "scheduled-daily-cost-guard" })
  }
}

# -----------------------------------------------------------------------------
# (d) AWS Budgets $150 → SNS → Lambda
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "budget_alerts" {
  name = "${var.project_name}-budget-alerts"
  tags = { Name = "${var.project_name}-budget-alerts" }
}

# Allow Budgets service to publish to SNS
resource "aws_sns_topic_policy" "budget_alerts" {
  arn = aws_sns_topic.budget_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowBudgetsPublish"
      Effect = "Allow"
      Principal = {
        Service = "budgets.amazonaws.com"
      }
      Action   = "SNS:Publish"
      Resource = aws_sns_topic.budget_alerts.arn
    }]
  })
}

# Wire SNS → Cost Guard Lambda
resource "aws_sns_topic_subscription" "budget_to_cost_guard" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.cost_guard.arn
}

resource "aws_lambda_permission" "sns_budget_invoke" {
  statement_id  = "AllowBudgetSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_guard.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.budget_alerts.arn
}

# Also add email subscription to budget alerts
resource "aws_sns_topic_subscription" "budget_email" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# AWS Budget: $150 daily hard cap
resource "aws_budgets_budget" "cost_cap" {
  name              = "${var.project_name}-w6-cost-cap"
  budget_type       = "COST"
  limit_amount      = "150"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-05-01_00:00"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_alerts.arn]
  }
}

# CloudWatch alarm tracking cost guard custom metric
resource "aws_cloudwatch_metric_alarm" "cost_guard_stopped_resources" {
  alarm_name          = "${var.project_name}-cost-guard-resources-stopped"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ResourcesStopped"
  namespace           = "GeekBrain/CostGuard"
  period              = 86400
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Cost Guard stopped at least one resource today"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "${var.project_name}-cost-guard-alarm" }
}
