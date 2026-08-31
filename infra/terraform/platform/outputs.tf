output "argocd_admin_password_command" {
  description = "Read the ArgoCD admin password ArgoCD generated at install time."
  value       = module.platform.argocd_admin_password_command
}

output "argocd_port_forward_command" {
  description = "ArgoCD has no public Ingress by design - exposing a deployment tool to the internet buys nothing here. Reach it over a port-forward at https://localhost:8080."
  value       = "kubectl port-forward -n ${module.platform.argocd_namespace} svc/argocd-server 8080:443"
}

output "grafana_port_forward_command" {
  description = "Grafana is likewise not exposed publicly. Default login is admin / prom-operator."
  value       = var.enable_monitoring ? "kubectl port-forward -n ${module.platform.monitoring_namespace} svc/kube-prometheus-stack-grafana 3000:80" : null
}

output "alb_controller_role_arn" {
  description = "IRSA role the AWS Load Balancer Controller assumes to create ALBs."
  value       = module.platform.alb_controller_role_arn
}

# --- only populated when domain_name is set --------------------------------

output "certificate_arn" {
  description = "ACM certificate ARN. Goes into the alb.ingress.kubernetes.io/certificate-arn annotation in k8s/overlays/dev/patches/ingress-tls.yaml."
  value       = var.domain_name == "" ? null : module.dns[0].certificate_arn
}

output "app_url" {
  description = "Public URL. This exact value must also be set as CORS_ORIGIN in k8s/overlays/dev/patches/configmap.yaml, because the backend builds emailed verification and password-reset links from it."
  value       = var.domain_name == "" ? null : module.dns[0].app_url
}
