output "role_arn" {
  description = "Role ARN. Set this as the AWS_CI_ROLE_ARN variable on the matching GitHub Environment."
  value       = aws_iam_role.ci.arn
}

output "role_name" {
  description = "Role name."
  value       = aws_iam_role.ci.name
}

output "oidc_provider_arn" {
  description = "GitHub OIDC provider ARN, whether created here or passed in."
  value       = local.oidc_provider_arn
}

output "allowed_subjects" {
  description = "The exact sub claims this role accepts. Useful when debugging an AssumeRoleWithWebIdentity denial - compare against the sub in the failing run's token."
  value       = local.allowed_subjects
}
