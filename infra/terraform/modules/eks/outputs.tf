output "cluster_name" {
  description = "Cluster name."
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "Kubernetes API server endpoint. Consumed by the kubernetes and helm providers in the platform stack."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 CA bundle for the API server."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_version" {
  description = "Running Kubernetes version."
  value       = aws_eks_cluster.this.version
}

output "cluster_security_group_id" {
  description = "Security group EKS manages for control plane to node traffic."
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "oidc_provider_arn" {
  description = "IAM OIDC provider ARN. Every IRSA role trusts this."
  value       = aws_iam_openid_connect_provider.this.arn
}

output "oidc_provider_url" {
  description = "OIDC issuer without the https:// scheme, for IAM condition keys."
  value       = local.oidc_provider_url
}

output "node_role_arn" {
  description = "Managed node group instance role ARN."
  value       = aws_iam_role.node.arn
}

output "kms_key_arn" {
  description = "KMS key used for Secret envelope encryption."
  value       = aws_kms_key.eks.arn
}
