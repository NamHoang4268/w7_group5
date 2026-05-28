output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "bucket_id" {
  value = aws_s3_bucket.s3_assets.id
}
output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}
