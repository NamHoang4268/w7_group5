# =============================================================================
# MH-OBS: CloudWatch Dashboard + Custom Metrics + Log Insights Saved Query
# =============================================================================

# -----------------------------------------------------------------------------
# CloudWatch Dashboard
# Includes:
#   - Custom metrics: GeekBrain/Application (BedrockQueryLatencyMs,
#                     BedrockQueryCount, KBSyncItemsCount)
#   - Standard infra metrics: ECS CPU, ECS Memory, ALB 5xx, Lambda Errors
#   - Cost Guard + Security Guard operational metrics
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-w6-ops"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: Application Custom Metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Bedrock Query Latency (Custom Metric)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["GeekBrain/Application", "BedrockQueryLatencyMs",
              "Service", "geekbrain-backend",
            { label = "Query Latency (ms)", stat = "Average", period = 60, color = "#2196F3" }]
          ]
          yAxis    = { left = { label = "ms", min = 0 } }
          liveData = true
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Bedrock Query Count (Custom Metric)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["GeekBrain/Application", "BedrockQueryCount",
              "Service", "geekbrain-backend",
            { label = "Queries", stat = "Sum", period = 60, color = "#4CAF50" }]
          ]
          yAxis    = { left = { label = "count", min = 0 } }
          liveData = true
        }
      },
      # Row 2: Standard ECS Metrics
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "ECS CPU Utilization (Standard)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "CPUUtilization",
              "ClusterName", aws_ecs_cluster.main.name,
              "ServiceName", aws_ecs_service.backend.name,
            { label = "CPU %", stat = "Average", period = 60, color = "#FF9800" }]
          ]
          annotations = {
            horizontal = [{ value = 80, label = "Alarm threshold", color = "#FF5252" }]
          }
          yAxis = { left = { label = "%", min = 0, max = 100 } }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "ECS Memory Utilization (Standard)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "MemoryUtilization",
              "ClusterName", aws_ecs_cluster.main.name,
              "ServiceName", aws_ecs_service.backend.name,
            { label = "Memory %", stat = "Average", period = 60, color = "#9C27B0" }]
          ]
          annotations = {
            horizontal = [{ value = 80, label = "Alarm threshold", color = "#FF5252" }]
          }
          yAxis = { left = { label = "%", min = 0, max = 100 } }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Lambda KB-Sync Errors (Standard)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Errors",
              "FunctionName", aws_lambda_function.kb_auto_sync.function_name,
            { label = "Errors", stat = "Sum", period = 300, color = "#F44336" }],
            ["AWS/Lambda", "Invocations",
              "FunctionName", aws_lambda_function.kb_auto_sync.function_name,
            { label = "Invocations", stat = "Sum", period = 300, color = "#4CAF50" }]
          ]
          yAxis = { left = { label = "count", min = 0 } }
        }
      },
      # Row 3: ALB
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "ALB 5xx Errors (Standard)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count",
              "LoadBalancer", aws_lb.app.arn_suffix,
            { label = "5xx Errors", stat = "Sum", period = 300, color = "#F44336" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count",
              "LoadBalancer", aws_lb.app.arn_suffix,
            { label = "2xx OK", stat = "Sum", period = 300, color = "#4CAF50" }]
          ]
          yAxis = { left = { label = "count", min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "ALB Target Response Time (Standard)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime",
              "LoadBalancer", aws_lb.app.arn_suffix,
            { label = "Response Time (s)", stat = "Average", period = 60, color = "#FF9800" }]
          ]
          annotations = {
            horizontal = [{ value = 5, label = "5s alarm threshold", color = "#FF5252" }]
          }
          yAxis = { left = { label = "seconds", min = 0 } }
        }
      },
      # Row 4: Cost Guard + Security Guard Ops
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6
        properties = {
          title  = "Cost Guard: Resources Stopped (Custom)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["GeekBrain/CostGuard", "ResourcesStopped",
              "Action", "EC2Stop",
            { label = "EC2 Stopped", stat = "Sum", period = 86400, color = "#FF5252" }],
            ["GeekBrain/CostGuard", "ResourcesStopped",
              "Action", "ECSTaskStop",
            { label = "ECS Tasks Stopped", stat = "Sum", period = 86400, color = "#FF9800" }]
          ]
          yAxis = { left = { label = "count", min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 18
        width  = 12
        height = 6
        properties = {
          title  = "Security Guard: Remediations Applied (Custom)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["GeekBrain/SecurityGuard", "RemediationsApplied",
              "Action", "S3PublicAccessBlock",
            { label = "S3 Blocked", stat = "Sum", period = 3600, color = "#9C27B0" }],
            ["GeekBrain/SecurityGuard", "RemediationsApplied",
              "Action", "SGRevokeOpenSSH",
            { label = "SG Rules Revoked", stat = "Sum", period = 3600, color = "#F44336" }]
          ]
          yAxis = { left = { label = "count", min = 0 } }
        }
      },
      # Row 5: DynamoDB
      {
        type   = "metric"
        x      = 0
        y      = 24
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Throttled Requests (Standard)"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/DynamoDB", "ThrottledRequests",
              "TableName", aws_dynamodb_table.conversations.name,
            { label = "Throttled Requests", stat = "Sum", period = 300, color = "#F44336" }]
          ]
          yAxis = { left = { label = "count", min = 0 } }
        }
      },
      # Row 5: Alarm Status
      {
        type   = "alarm"
        x      = 12
        y      = 24
        width  = 12
        height = 6
        properties = {
          title = "Active CloudWatch Alarms"
          alarms = [
            aws_cloudwatch_metric_alarm.ecs_cpu_high.arn,
            aws_cloudwatch_metric_alarm.ecs_memory_high.arn,
            aws_cloudwatch_metric_alarm.alb_5xx.arn,
            aws_cloudwatch_metric_alarm.lambda_errors.arn,
            aws_cloudwatch_metric_alarm.security_guard_remediations.arn,
            aws_cloudwatch_metric_alarm.cost_guard_stopped_resources.arn,
          ]
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Insights Saved Query
# Saved queries require manual creation via console/CLI (Terraform resource
# aws_cloudwatch_query_definition provides this).
# -----------------------------------------------------------------------------

# Query 1: ECS Backend — 5xx errors by 5-minute window
resource "aws_cloudwatch_query_definition" "ecs_errors" {
  name = "GeekBrain/ECS-Error-Spikes"

  log_group_names = [aws_cloudwatch_log_group.ecs.name]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /ERROR|Exception|5[0-9][0-9]/
    | stats count(*) as error_count by bin(5m)
    | sort @timestamp desc
    | limit 20
  EOT
}

# Query 2: ECS Backend — Bedrock latency extraction
resource "aws_cloudwatch_query_definition" "bedrock_latency" {
  name = "GeekBrain/Bedrock-Query-Latency"

  log_group_names = [aws_cloudwatch_log_group.ecs.name]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /bedrock|latency|query_time/
    | parse @message "latency_ms=*" as latency_ms
    | stats avg(latency_ms) as avg_latency, max(latency_ms) as max_latency, count(*) as total_queries by bin(15m)
    | sort @timestamp desc
    | limit 30
  EOT
}

# Query 3: Security Guard Lambda — remediation audit trail
resource "aws_cloudwatch_query_definition" "security_remediations" {
  name = "GeekBrain/SecurityGuard-Remediation-Audit"

  log_group_names = [aws_cloudwatch_log_group.security_guard.name]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /REMEDIATED|VIOLATION/
    | parse @message "REMEDIATED: *" as remediation_action
    | parse @message "VIOLATION: *" as violation_detail
    | stats count(*) as total by bin(1h)
    | sort @timestamp desc
  EOT
}

# Query 4: Cost Guard Lambda — daily stop audit
resource "aws_cloudwatch_query_definition" "cost_guard_audit" {
  name = "GeekBrain/CostGuard-Stop-Audit"

  log_group_names = [aws_cloudwatch_log_group.cost_guard.name]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /Stopping|stopped|Cost Guard/
    | parse @message "Stopping EC2 instances: *" as stopped_instances
    | sort @timestamp desc
    | limit 50
  EOT
}
