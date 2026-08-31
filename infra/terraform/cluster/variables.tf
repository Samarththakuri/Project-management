variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "project_name" {
  description = "Project slug. Drives ECR repository names, which must match ECR_REPO_PREFIX in GitHub Actions and the image names in k8s/base/kustomization.yaml."
  type        = string
  default     = "projectcamp"
}

variable "environment" {
  description = "Environment name. Only dev exists in this project; it is a variable so names and tags stay consistent rather than hardcoded in a dozen places."
  type        = string
  default     = "dev"
}

variable "github_repository" {
  description = "This repository in owner/name form. Baked into the CI role's OIDC trust policy, so only workflows in this repository can assume it."
  type        = string
}

# --- network ---------------------------------------------------------------

variable "vpc_cidr" {
  description = "VPC CIDR."
  type        = string
  default     = "10.10.0.0/16"
}

variable "az_count" {
  description = "Availability Zones to span. Two is the EKS minimum; three lets the ALB and the node group survive a full AZ outage."
  type        = number
  default     = 3
}

variable "single_nat_gateway" {
  description = "Share one NAT Gateway across all AZs. Roughly 32 USD/month cheaper per gateway removed, at the cost of AZ-independent egress. True is the right call for dev."
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs. Off in dev - it is a CloudWatch bill for data nobody reads."
  type        = bool
  default     = false
}

# --- cluster ---------------------------------------------------------------

variable "kubernetes_version" {
  description = "EKS control plane version. Confirm availability with: aws eks describe-cluster-versions --region <region>"
  type        = string
  default     = "1.33"
}

variable "node_instance_type" {
  description = "Worker node instance type."
  type        = string
  default     = "t3.medium"
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT."
  type        = string
  default     = "SPOT"
}

variable "desired_nodes" {
  description = "Desired worker node count."
  type        = number
  default     = 2
}

variable "min_nodes" {
  description = "Minimum worker node count."
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum worker node count."
  type        = number
  default     = 4
}

variable "endpoint_public_access_cidrs" {
  description = "CIDRs allowed to reach the public Kubernetes API endpoint. Narrow this to your own address once bootstrap is done; IAM authentication still applies either way."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "admin_access_entries" {
  description = "Extra IAM principals granted cluster-admin via EKS Access Entries. The identity that runs terraform apply already has access."
  type        = list(string)
  default     = []
}

# --- ECR -------------------------------------------------------------------

variable "ecr_keep_last_images" {
  description = "Images retained per repository before the oldest are expired. Keep enough history that you can still roll back to a week-old commit."
  type        = number
  default     = 30
}

variable "ecr_untagged_expiry_days" {
  description = "Days before untagged images are expired."
  type        = number
  default     = 7
}
