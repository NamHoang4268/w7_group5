# =============================================================================
# MH1: Multi-VPC Connectivity
# App VPC (hosts ECS Fargate, EFS, RDS, Network Firewall)
# Data VPC (isolated tier for connectivity demonstration)
# =============================================================================

resource "aws_vpc" "app" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-app-vpc" }
}

resource "aws_vpc" "data" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-data-vpc" }
}

# =============================================================================
# App VPC Subnets
# =============================================================================

resource "aws_subnet" "app_public" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "${var.project_name}-app-public" }
}



resource "aws_subnet" "app_private" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "${var.project_name}-app-private" }
}

# --- Data VPC Subnet ---
resource "aws_subnet" "data_private" {
  vpc_id            = aws_vpc.data.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "${var.project_name}-data-private" }
}

# =============================================================================
# Route Tables
# =============================================================================

resource "aws_internet_gateway" "app" {
  vpc_id = aws_vpc.app.id
  tags   = { Name = "${var.project_name}-igw" }
}

resource "aws_route_table" "app_public_rt" {
  vpc_id = aws_vpc.app.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.app.id
  }
  tags = { Name = "${var.project_name}-app-public-rt" }
}

resource "aws_route_table_association" "app_public" {
  subnet_id      = aws_subnet.app_public.id
  route_table_id = aws_route_table.app_public_rt.id
}



resource "aws_route_table" "app_private" {
  vpc_id = aws_vpc.app.id

  route {
    cidr_block                = aws_vpc.data.cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.app_to_data.id
  }

  tags = { Name = "${var.project_name}-app-private-rt" }
}

resource "aws_route_table_association" "app_private" {
  subnet_id      = aws_subnet.app_private.id
  route_table_id = aws_route_table.app_private.id
}

# Data VPC RT
resource "aws_route_table" "data_private" {
  vpc_id = aws_vpc.data.id
  route {
    cidr_block                = aws_vpc.app.cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.app_to_data.id
  }

  tags = { Name = "${var.project_name}-data-private-rt" }
}

resource "aws_route_table_association" "data_private" {
  subnet_id      = aws_subnet.data_private.id
  route_table_id = aws_route_table.data_private.id
}

# =============================================================================
# VPC Endpoints (Gateway only — traffic via NAT EC2 for Interface endpoints)
# Interface endpoints removed: traffic routes through NAT EC2 (geekbrain-nat-ec2)
# Gateway endpoints kept (free, improve S3/DynamoDB performance)
# =============================================================================

# Gateway Endpoint: S3 (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.app.id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  route_table_ids = [aws_route_table.app_private.id]

  tags = { Name = "${var.project_name}-vpce-s3" }
}

# Gateway Endpoint: DynamoDB (free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.app.id
  service_name = "com.amazonaws.${var.aws_region}.dynamodb"

  route_table_ids = [aws_route_table.app_private.id]

  tags = { Name = "${var.project_name}-vpce-dynamodb" }
}


# =============================================================================
# MH2: NACL — Defense-in-depth for App VPC private subnets
# =============================================================================

resource "aws_network_acl" "app_private" {
  vpc_id     = aws_vpc.app.id
  subnet_ids = [aws_subnet.app_private.id]

  ingress {
    rule_no    = 50
    protocol   = "tcp"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 22
    to_port    = 22
  }

  ingress {
    rule_no    = 51
    protocol   = "tcp"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 3389
    to_port    = 3389
  }

  ingress {
    rule_no    = 100
    protocol   = "-1"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    rule_no    = 100
    protocol   = "-1"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = { Name = "${var.project_name}-app-private-nacl" }
}

# =============================================================================
# VPC Peering (App VPC <-> Data VPC)
# =============================================================================

resource "aws_vpc_peering_connection" "app_to_data" {
  vpc_id      = aws_vpc.app.id
  peer_vpc_id = aws_vpc.data.id
  auto_accept = true

  requester { allow_remote_vpc_dns_resolution = true }
  accepter { allow_remote_vpc_dns_resolution = true }

  tags = { Name = "${var.project_name}-app-to-data-peering" }
}

# =============================================================================
# VPC Flow Logs (required for MH1 observability)
# =============================================================================

resource "aws_cloudwatch_log_group" "flow_logs_app" {
  name              = "/vpc/flow-logs/${var.project_name}-app"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "flow_logs_data" {
  name              = "/vpc/flow-logs/${var.project_name}-data"
  retention_in_days = 7
}

resource "aws_iam_role" "flow_logs" {
  name = "${var.project_name}-flow-logs-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "flow-logs-publish"
  role = aws_iam_role.flow_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"]
      Resource = [
        aws_cloudwatch_log_group.flow_logs_app.arn,
        aws_cloudwatch_log_group.flow_logs_data.arn,
        "${aws_cloudwatch_log_group.flow_logs_app.arn}:*",
        "${aws_cloudwatch_log_group.flow_logs_data.arn}:*"
      ]
    }]
  })
}

resource "aws_flow_log" "app" {
  vpc_id               = aws_vpc.app.id
  traffic_type         = "ALL"
  iam_role_arn         = aws_iam_role.flow_logs.arn
  log_destination      = aws_cloudwatch_log_group.flow_logs_app.arn
  log_destination_type = "cloud-watch-logs"
}

resource "aws_flow_log" "data" {
  vpc_id               = aws_vpc.data.id
  traffic_type         = "ALL"
  iam_role_arn         = aws_iam_role.flow_logs.arn
  log_destination      = aws_cloudwatch_log_group.flow_logs_data.arn
  log_destination_type = "cloud-watch-logs"
}
