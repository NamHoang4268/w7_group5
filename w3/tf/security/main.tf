resource "aws_security_group" "alb_sg" {
  name        = "${var.proj_name}-alb-sg"
  description = "Cho phep truy cap web (http/80) tu toan the internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP Public Access"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app_sg" {
  name        = "${var.proj_name}-app-sg"
  description = "Chi nhan traffic chuyen den tu Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Nhan traffic Web tu ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "data_sg" {
  name        = "${var.proj_name}-data-sg"
  description = "Chi nhan traffic tu tang App (MySQL & Redis)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Giao tiep DocumentDB"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ==========================================
# SECRETS MANAGER (Bảo mật API Keys)
# ==========================================
resource "aws_secretsmanager_secret" "backend_secrets" {
  name_prefix             = "${var.proj_name}-backend-keys-"
  description             = "Chứa toàn bộ API Keys nhạy cảm cho Backend"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "backend_secrets_values" {
  secret_id = aws_secretsmanager_secret.backend_secrets.id
  secret_string = jsonencode({
    MONGODB_URL                       = "mongodb://${var.db_username}:${var.db_password}@${var.db_endpoint}:27017/?tls=true&tlsCAFile=/app/global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
    SECRET_KEY_ACCESS_TOKEN           = var.secret_key_access_token
    SECRET_KEY_REFRESH_TOKEN          = var.secret_key_refresh_token
    STRIPE_SECRET_KEY                 = var.stripe_secret_key
    STRIPE_ENPOINT_WEBHOOK_SECRET_KEY = var.stripe_webhook_secret
    STRIPE_CLI_WEBHOOK_SECRET         = var.stripe_webhook_secret
    EMAIL_USER                        = var.email_user
    EMAIL_PASS                        = var.email_pass
    GOOGLE_CLIENT_ID                  = var.google_client_id
    GOOGLE_CLIENT_SECRET              = var.google_client_secret
    GEMINI_API_KEY                    = var.gemini_api_key
    RESEND_API                        = var.resend_api
  })
}
