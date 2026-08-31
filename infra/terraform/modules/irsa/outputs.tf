output "role_arn" {
  description = "Role ARN to put in the ServiceAccount's eks.amazonaws.com/role-arn annotation."
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "Role name."
  value       = aws_iam_role.this.name
}
