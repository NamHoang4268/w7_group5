# =============================================================================
# MH3: EFS File Storage Layer
# =============================================================================

resource "aws_efs_file_system" "app" {
  creation_token   = "53e94124-f81e-417a-bd1a-35f66ed1a00a"
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = {
    Name        = "${var.project_name}-efs"
    Environment = var.environment
  }
}

resource "aws_security_group" "efs_sg" {
  name        = "${var.project_name}-efs-sg-v2"
  description = "EFS mount - NFS from app tier only (cross-VPC via peering)"
  vpc_id      = aws_vpc.data.id

  ingress {
    description = "NFS from App VPC private subnets (cross-VPC via peering)"
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = ["10.0.11.0/24", "10.0.12.0/24"]
  }

  egress {
    description = "NFS response to App VPC private subnets"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.11.0/24", "10.0.12.0/24"]
  }

  tags = { Name = "${var.project_name}-efs-sg" }
}

resource "aws_efs_mount_target" "data" {
  file_system_id  = aws_efs_file_system.app.id
  subnet_id       = aws_subnet.data_private.id
  security_groups = [aws_security_group.efs_sg.id]
}

resource "aws_efs_mount_target" "data_b" {
  file_system_id  = aws_efs_file_system.app.id
  subnet_id       = aws_subnet.data_private_b.id
  security_groups = [aws_security_group.efs_sg.id]
}

# =============================================================================
# Route 53 PHZ: resolve EFS DNS from App VPC to Data VPC mount targets
# EFS DNS (fs-xxx.efs.region.amazonaws.com) only auto-resolves in the VPC
# where mount targets live. This PHZ lets App VPC tasks resolve it cross-VPC.
# =============================================================================

resource "aws_route53_zone" "efs_cross_vpc" {
  name = "efs.${var.aws_region}.amazonaws.com"

  vpc {
    vpc_id = aws_vpc.app.id
  }

  lifecycle {
    ignore_changes = [vpc]
  }

  tags = { Name = "${var.project_name}-efs-phz" }
}

resource "aws_route53_record" "efs_az_a" {
  zone_id = aws_route53_zone.efs_cross_vpc.zone_id
  name    = "${aws_efs_file_system.app.id}.efs.${var.aws_region}.amazonaws.com"
  type    = "A"
  ttl     = 60

  records = [aws_efs_mount_target.data.ip_address, aws_efs_mount_target.data_b.ip_address]
}

# Access Point for SQLite database (isolated from knowledge_base)
resource "aws_efs_access_point" "database" {
  file_system_id = aws_efs_file_system.app.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/database"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "0755"
    }
  }

  tags = {
    Name = "${var.project_name}-efs-ap-database"
  }
}
