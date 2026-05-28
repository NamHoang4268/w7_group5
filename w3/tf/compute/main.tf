# ==========================================

resource "aws_ecs_cluster" "main" {
  name = "${var.proj_name}-cluster"
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.proj_name}-backend"
  retention_in_days = 7
}

# IAM Role for ECS Task Execution (Pull image, Push Logs, Get Secrets Manager)
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.proj_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Cho phép ECS Execution Role được lấy chìa khoá từ Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets_access" {
  name = "${var.proj_name}-secrets-access"
  role = aws_iam_role.ecs_task_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["secretsmanager:GetSecretValue"]
        Effect   = "Allow"
        Resource = [var.backend_secrets_arn]
      }
    ]
  })
}

# IAM Role for ECS Task (S3 Access)
resource "aws_iam_role" "app_role" {
  name = "${var.proj_name}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_access" {
  name = "${var.proj_name}-s3-access"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:s3:::${var.s3_bucket}",
          "arn:aws:s3:::${var.s3_bucket}/*"
        ]
      },
      {
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.proj_name}-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.app_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend-container"
      image     = var.ecr_repository_url
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "PORT", value = "8080" },
        { name = "FRONTEND_URL", value = var.cdn_base_url },
        { name = "S3_BUCKET", value = var.s3_bucket },
        { name = "AWS_REGION", value = var.vpc_region },
        { name = "CDN_BASE_URL", value = var.cdn_base_url }
      ]
      secrets = [
        { name = "MONGODB_URL", valueFrom = "${var.backend_secrets_arn}:MONGODB_URL::" },
        { name = "SECRET_KEY_ACCESS_TOKEN", valueFrom = "${var.backend_secrets_arn}:SECRET_KEY_ACCESS_TOKEN::" },
        { name = "SECRET_KEY_REFRESH_TOKEN", valueFrom = "${var.backend_secrets_arn}:SECRET_KEY_REFRESH_TOKEN::" },
        { name = "STRIPE_SECRET_KEY", valueFrom = "${var.backend_secrets_arn}:STRIPE_SECRET_KEY::" },
        { name = "STRIPE_ENPOINT_WEBHOOK_SECRET_KEY", valueFrom = "${var.backend_secrets_arn}:STRIPE_ENPOINT_WEBHOOK_SECRET_KEY::" },
        { name = "STRIPE_CLI_WEBHOOK_SECRET", valueFrom = "${var.backend_secrets_arn}:STRIPE_CLI_WEBHOOK_SECRET::" },
        { name = "EMAIL_USER", valueFrom = "${var.backend_secrets_arn}:EMAIL_USER::" },
        { name = "EMAIL_PASS", valueFrom = "${var.backend_secrets_arn}:EMAIL_PASS::" },
        { name = "GOOGLE_CLIENT_ID", valueFrom = "${var.backend_secrets_arn}:GOOGLE_CLIENT_ID::" },
        { name = "GOOGLE_CLIENT_SECRET", valueFrom = "${var.backend_secrets_arn}:GOOGLE_CLIENT_SECRET::" },
        { name = "GEMINI_API_KEY", valueFrom = "${var.backend_secrets_arn}:GEMINI_API_KEY::" },
        { name = "RESEND_API", valueFrom = "${var.backend_secrets_arn}:RESEND_API::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.vpc_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend_service" {
  name                   = "${var.proj_name}-ecs-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend.arn
  desired_count          = 2
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    # Su dung Private Subnets va di ra Internet qua NAT Gateway
    subnets          = var.private_subnets
    security_groups  = [var.app_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.app_tg_arn
    container_name   = "backend-container"
    container_port   = 8080
  }
}

