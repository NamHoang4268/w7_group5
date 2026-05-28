resource "aws_docdb_subnet_group" "docdb_subnet_group" {
  name       = "${var.proj_name}-docdb-subnet-group"
  subnet_ids = var.database_subnets
}

resource "aws_docdb_cluster" "mongodb" {
  cluster_identifier = "${var.proj_name}-docdb-cluster"
  engine             = "docdb"
  storage_encrypted  = true
  # kms_key_id        = aws_kms_key.my_db_key.arn #TODO: prod nên có
  master_username        = var.db_username
  master_password        = var.db_password
  db_subnet_group_name   = aws_docdb_subnet_group.docdb_subnet_group.name
  vpc_security_group_ids = [var.data_sg_id]
  skip_final_snapshot    = true
}

resource "aws_docdb_cluster_instance" "mongodb_instance" {
  # Vì DocumentDB rất đắt đỏ, em quyết định đánh đổi rủi ro Single Point of Failure (SPOF) nên set count=1 để giảm hao phí khi làm bài trên lớp.
  # DocumentDB lưu trữ ở 3 zone nên data an toàn, chỉ là HA Compute của em thấp.
  count              = 1
  identifier         = "${var.proj_name}-docdb-instance-${count.index}"
  cluster_identifier = aws_docdb_cluster.mongodb.id
  instance_class     = "db.t3.medium"
}
