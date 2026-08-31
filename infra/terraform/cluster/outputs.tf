# Outputs fall into two groups:
#
#   1. Consumed by the platform stack via terraform_remote_state. These are the
#      contract between the two layers - renaming one breaks the platform apply.
#   2. Values you copy into GitHub settings or paste into a terminal.

# --- consumed by platform/ -------------------------------------------------

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value     = module.eks.cluster_certificate_authority_data
  sensitive = true
}

output "oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

output "oidc_provider_url" {
  value = module.eks.oidc_provider_url
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

# --- for you ---------------------------------------------------------------

output "ecr_registry" {
  description = "Registry host. Set nothing in GitHub for this - the workflow reads it from the ECR login step - but you need it to push an image by hand in Phase 6."
  value       = split("/", module.ecr_backend.repository_url)[0]
}

output "ecr_backend_repository_url" {
  value = module.ecr_backend.repository_url
}

output "ecr_frontend_repository_url" {
  value = module.ecr_frontend.repository_url
}

output "ci_role_arn" {
  description = "Set this as the AWS_CI_ROLE_ARN repository variable in GitHub. It is what deploy.yml assumes over OIDC."
  value       = module.github_oidc.role_arn
}

output "nat_gateway_public_ips" {
  description = "Add these to the MongoDB Atlas IP access list. All cluster egress leaves through them, so Atlas sees these addresses rather than the pod IPs."
  value       = module.vpc.nat_gateway_public_ips
}

output "kubeconfig_command" {
  description = "Run this before applying the platform stack, which talks to the cluster directly."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
