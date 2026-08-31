variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "project_name" {
  description = "Project slug."
  type        = string
  default     = "projectcamp"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "state_bucket" {
  description = "Terraform state bucket. Needed explicitly by the remote_state data source, which cannot inherit it from -backend-config. Same value as in backend.hcl."
  type        = string
}

# --- platform components ---------------------------------------------------

variable "enable_monitoring" {
  description = "Install kube-prometheus-stack (Prometheus + Grafana). Set false to skip it; nothing in the core pipeline depends on it."
  type        = bool
  default     = true
}

variable "prometheus_retention" {
  description = "How long Prometheus keeps samples."
  type        = string
  default     = "7d"
}

variable "prometheus_storage_size" {
  description = "Prometheus PVC size. Backed by EBS via the CSI driver the cluster stack enables."
  type        = string
  default     = "10Gi"
}

variable "grafana_storage_size" {
  description = "Grafana PVC size."
  type        = string
  default     = "2Gi"
}

# --- DNS / TLS (optional) --------------------------------------------------

variable "domain_name" {
  description = "Registered domain, e.g. example.com. Empty disables DNS and TLS provisioning entirely, and the app is reached at the ALB's own hostname over HTTP."
  type        = string
  default     = ""
}

variable "subdomain" {
  description = "Host label, e.g. dev. Empty serves the apex."
  type        = string
  default     = "dev"
}

variable "create_hosted_zone" {
  description = "Create the public hosted zone. Set false if the zone already exists in this account."
  type        = bool
  default     = false
}

variable "create_dns_record" {
  description = "Create the Route53 alias record. Must stay false until ArgoCD has synced the Ingress and the ALB actually exists - see the two-pass note in modules/route53-acm."
  type        = bool
  default     = false
}

variable "ingress_namespace" {
  description = "Namespace the application Ingress is deployed into. Must match k8s/overlays/dev."
  type        = string
  default     = "projectcamp-dev"
}

variable "ingress_name" {
  description = "Name of the application Ingress. Must match k8s/base/ingress.yaml, including any prefix an overlay adds."
  type        = string
  default     = "projectcamp"
}
