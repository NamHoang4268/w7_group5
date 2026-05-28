# =============================================================================
# Security Groups
# =============================================================================

# CloudFront managed prefix list
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# ALB: internet-facing, restricted to CloudFront managed prefix list
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-alb-sg-appvpc"
  description = "ALB in App VPC - HTTP from CloudFront only"
  vpc_id      = aws_vpc.app.id

  ingress {
    description     = "HTTP from CloudFront edge"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    description = "HTTP to ECS tasks in private subnets"
    from_port   = 8001
    to_port     = 8001
    protocol    = "tcp"
    cidr_blocks = ["10.0.11.0/24", "10.0.12.0/24"]
  }

  tags = { Name = "${var.project_name}-alb-sg" }
}

# ECS Tasks: accepts traffic from ALB only
resource "aws_security_group" "ecs_task_sg" {
  name        = "${var.project_name}-ecs-task-sg-appvpc"
  description = "ECS Fargate tasks - traffic from ALB"
  vpc_id      = aws_vpc.app.id

  ingress {
    description     = "API from ALB"
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # HTTPS to VPC Endpoints (Bedrock, ECR, SSM, CloudWatch Logs)
  egress {
    description     = "HTTPS to VPC Endpoints"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.vpc_endpoints.id]
  }

  # HTTPS to S3/DynamoDB Gateway Endpoints (use prefix lists)
  egress {
    description     = "HTTPS to S3 Gateway Endpoint"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.s3.prefix_list_id]
  }

  egress {
    description     = "HTTPS to DynamoDB Gateway Endpoint"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.dynamodb.prefix_list_id]
  }

  # NFS to EFS in Data VPC (cross-VPC via peering)
  egress {
    description = "NFS to EFS in Data VPC"
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = ["10.1.1.0/24", "10.1.2.0/24"]
  }

  # Localhost (monitoring API on port 8000 within same task)
  egress {
    description = "Localhost monitoring API"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["10.0.11.0/24", "10.0.12.0/24"]
  }

  tags = { Name = "${var.project_name}-ecs-task-sg" }
}

# =============================================================================
# ECS Fargate: Application Deployment
# =============================================================================

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  tags                 = { Name = "${var.project_name}-backend" }
}

resource "aws_ecs_cluster" "main" {
  name = var.project_name
  tags = { Name = var.project_name, Environment = var.environment }
}

# =============================================================================
# Application Load Balancer (public subnets, internet-facing)
# =============================================================================

resource "aws_lb" "app" {
  name               = "${var.project_name}-appvpc-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.app_public.id, aws_subnet.app_public_b.id]
  tags               = { Name = "${var.project_name}-alb" }
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-appvpc-tg"
  port        = 8001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.app.id
  target_type = "ip"

  health_check {
    path                = "/health"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# =============================================================================
# ECS Task Definition (with EFS volume + RDS connection)
# =============================================================================

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  volume {
    name = "efs-knowledge-base"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.app.id
      root_directory     = "/"
      transit_encryption = "ENABLED"
    }
  }

  volume {
    name = "efs-database"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.app.id
      transit_encryption = "ENABLED"
      root_directory     = "/"
      authorization_config {
        access_point_id = aws_efs_access_point.database.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name  = "${var.project_name}-backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"
    portMappings = [
      { containerPort = 8001, protocol = "tcp" },
      { containerPort = 8000, protocol = "tcp" }
    ]
    mountPoints = [
      {
        sourceVolume  = "efs-knowledge-base"
        containerPath = "/mnt/efs"
        readOnly      = false
      },
      {
        sourceVolume  = "efs-database"
        containerPath = "/mnt/efs/database"
        readOnly      = false
      }
    ]
    environment = [
      { name = "MONITORING_API_URL", value = "http://localhost:8000" },
      { name = "AWS_DEFAULT_REGION", value = var.aws_region },
      { name = "DYNAMODB_REGION", value = var.aws_region },
      { name = "EFS_KNOWLEDGE_BASE_PATH", value = "/mnt/efs/knowledge_base" },
      { name = "DB_PATH", value = "/mnt/efs/database/geekbrain.db" }
    ]
    secrets = [
      { name = "BEDROCK_KB_ID", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/geekbrain/BEDROCK_KB_ID" },
      { name = "BEDROCK_DS_ID", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/geekbrain/BEDROCK_DS_ID" },
      { name = "BEDROCK_MODEL_ID", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/geekbrain/BEDROCK_MODEL_ID" },
      { name = "DYNAMODB_TABLE", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/geekbrain/DYNAMODB_TABLE" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    essential = true
  }])
}

# =============================================================================
# ECS Service
# =============================================================================

resource "aws_ecs_service" "backend" {
  name             = "${var.project_name}-backend-appvpc"
  cluster          = aws_ecs_cluster.main.id
  task_definition  = aws_ecs_task_definition.backend.arn
  desired_count    = 2
  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  network_configuration {
    subnets          = [aws_subnet.app_private.id, aws_subnet.app_private_b.id]
    security_groups  = [aws_security_group.ecs_task_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "${var.project_name}-backend"
    container_port   = 8001
  }

  depends_on = [aws_lb_listener.http]
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 7
}

# =============================================================================
# IAM: ECS Execution Role (pull images, read SSM)
# =============================================================================

resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name = "SSMReadPolicy"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/geekbrain/*"
    }]
  })
}

# =============================================================================
# IAM: ECS Task Role (Bedrock, DynamoDB, S3)
# =============================================================================

resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "GeekBrainTaskPolicy"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/*",
          "arn:aws:bedrock:*:${data.aws_caller_identity.current.account_id}:inference-profile/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:Retrieve"]
        Resource = aws_bedrockagent_knowledge_base.main.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query", "dynamodb:DeleteItem", "dynamodb:BatchWriteItem"]
        Resource = aws_dynamodb_table.conversations.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.knowledge_base.arn, "${aws_s3_bucket.knowledge_base.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["elasticfilesystem:ClientMount", "elasticfilesystem:ClientWrite"]
        Resource = aws_efs_file_system.app.arn
      }
    ]
  })
}
