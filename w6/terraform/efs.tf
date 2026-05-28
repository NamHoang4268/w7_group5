resource "aws_efs_file_system" "app" {
  creation_token   = "${var.project_name}-efs-token"
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = { Name = "${var.project_name}-efs" }
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
    cidr_blocks = [aws_vpc.app.cidr_block]
  }

  egress {
    description = "NFS response to App VPC private subnets"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.app.cidr_block]
  }

  tags = { Name = "${var.project_name}-efs-sg" }
}

resource "aws_efs_mount_target" "data" {
  file_system_id  = aws_efs_file_system.app.id
  subnet_id       = aws_subnet.data_private.id
  security_groups = [aws_security_group.efs_sg.id]
}

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

  records = [aws_efs_mount_target.data.ip_address]
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

  tags = { Name = "${var.project_name}-efs-ap-database" }
}
