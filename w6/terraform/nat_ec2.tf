# =============================================================================
# NAT EC2 Instance — Replaces 7 Interface VPC Endpoints
# Routes all outbound internet traffic from private subnet
# Source/Destination check MUST be disabled for NAT to work
# =============================================================================

resource "aws_security_group" "nat_ec2" {
  name        = "${var.project_name}-nat-ec2-sg"
  description = "Allow traffic to Internet"
  vpc_id      = aws_vpc.app.id

  ingress {
    description = "All traffic from App VPC (private subnet traffic to NAT)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.app.cidr_block]
  }

  egress {
    description = "All outbound to internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-nat-ec2-sg" }
}

resource "aws_instance" "nat_ec2" {
  ami                         = "ami-0236922087fa98b6e" # Amazon Linux 2 NAT AMI
  instance_type               = "t3.nano"
  subnet_id                   = aws_subnet.app_public.id
  vpc_security_group_ids      = [aws_security_group.nat_ec2.id]
  source_dest_check           = false # Required for NAT functionality
  associate_public_ip_address = true

  tags = {
    Name = "${var.project_name}-nat-ec2"
    keep = "true" # Cost Guard: never stop this instance
  }

  lifecycle {
    # Prevent accidental replacement — NAT EC2 downtime kills all private subnet traffic
    prevent_destroy = true
    ignore_changes  = [ami, associate_public_ip_address]
  }
}

# Route: private subnet → NAT EC2 → internet
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.app_private.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat_ec2.primary_network_interface_id
}
