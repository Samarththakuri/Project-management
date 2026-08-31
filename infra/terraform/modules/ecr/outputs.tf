output "repository_name" {
  description = "Repository name."
  value       = aws_ecr_repository.this.name
}

output "repository_url" {
  description = "Full repository URL, i.e. <account>.dkr.ecr.<region>.amazonaws.com/<name>."
  value       = aws_ecr_repository.this.repository_url
}

output "repository_arn" {
  description = "Repository ARN. Used to scope the CI role's push permissions to exactly this repository."
  value       = aws_ecr_repository.this.arn
}

output "registry_id" {
  description = "AWS account id that owns the registry."
  value       = aws_ecr_repository.this.registry_id
}
