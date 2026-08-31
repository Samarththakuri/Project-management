variable "cluster_name" {
  description = "EKS cluster name. Passed to the load balancer controller so it only manages resources tagged for this cluster."
  type        = string
}

variable "region" {
  description = "AWS region."
  type        = string
}

variable "vpc_id" {
  description = "VPC id, given explicitly to the load balancer controller so it does not have to discover it via IMDS."
  type        = string
}

variable "oidc_provider_arn" {
  description = "Cluster IAM OIDC provider ARN, for IRSA."
  type        = string
}

variable "oidc_provider_url" {
  description = "Cluster OIDC issuer without the scheme."
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)."
  type        = string
}

# --- chart versions --------------------------------------------------------
# Every chart is pinned. An unpinned chart means `terraform apply` can silently
# roll out a new controller version, which is the opposite of reproducible.

variable "alb_controller_chart_version" {
  description = "aws-load-balancer-controller chart version."
  type        = string
  default     = "3.5.0"
}

variable "argocd_chart_version" {
  description = "argo-cd chart version."
  type        = string
  default     = "10.3.2"
}

variable "kube_prometheus_stack_chart_version" {
  description = "kube-prometheus-stack chart version."
  type        = string
  default     = "88.3.0"
}

variable "metrics_server_chart_version" {
  description = "metrics-server chart version."
  type        = string
  default     = "3.13.1"
}

# --- feature toggles -------------------------------------------------------

variable "enable_monitoring" {
  description = "Install kube-prometheus-stack. Its Prometheus and Grafana pods plus their PVCs are the single largest platform cost after the nodes themselves."
  type        = bool
  default     = true
}

variable "prometheus_retention" {
  description = "How long Prometheus keeps samples."
  type        = string
  default     = "15d"
}

variable "prometheus_storage_size" {
  description = "PVC size for the Prometheus TSDB. Requires the EBS CSI driver."
  type        = string
  default     = "20Gi"
}

variable "grafana_storage_size" {
  description = "PVC size for Grafana."
  type        = string
  default     = "5Gi"
}

variable "tags" {
  description = "Tags applied to IAM resources created here."
  type        = map(string)
  default     = {}
}
