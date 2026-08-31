output "argocd_namespace" {
  description = "Namespace ArgoCD runs in."
  value       = local.argocd_namespace
}

output "alb_controller_role_arn" {
  description = "IRSA role the load balancer controller assumes."
  value       = module.alb_controller_irsa.role_arn
}

output "monitoring_namespace" {
  description = "Namespace the Prometheus stack runs in."
  value       = local.monitoring_namespace
}

output "argocd_admin_password_command" {
  description = "How to read the initial ArgoCD admin password. It is generated into a Secret by the chart and is deliberately not exported through Terraform state."
  value       = "kubectl -n ${local.argocd_namespace} get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
}
