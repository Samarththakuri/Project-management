variable "cluster_name" {
  description = "EKS cluster name. Must match the value used for the VPC subnet tags."
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes minor version for the control plane. Check what EKS currently offers with: aws eks describe-cluster-versions"
  type        = string
}

variable "vpc_id" {
  description = "VPC to place the cluster in."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for the control plane ENIs and every worker node. Nodes are never placed in public subnets."
  type        = list(string)
}

variable "node_instance_type" {
  description = "EC2 instance type for the managed node group."
  type        = string
  default     = "t3.medium"
}

variable "node_capacity_type" {
  description = "ON_DEMAND or SPOT. SPOT is materially cheaper and fine for dev; production workloads that cannot tolerate a two-minute eviction notice should stay ON_DEMAND."
  type        = string
  default     = "ON_DEMAND"

  validation {
    condition     = contains(["ON_DEMAND", "SPOT"], var.node_capacity_type)
    error_message = "node_capacity_type must be ON_DEMAND or SPOT."
  }
}

variable "node_disk_size" {
  description = "Root EBS volume size in GB for each node."
  type        = number
  default     = 30
}

variable "desired_nodes" {
  description = "Desired node count."
  type        = number
  default     = 2
}

variable "min_nodes" {
  description = "Minimum node count."
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum node count."
  type        = number
  default     = 4
}

variable "endpoint_public_access" {
  description = "Expose the Kubernetes API endpoint publicly. Kept on so kubectl and ArgoCD bootstrap work from a workstation without a bastion or VPN; narrow it with endpoint_public_access_cidrs."
  type        = bool
  default     = true
}

variable "endpoint_public_access_cidrs" {
  description = "CIDRs allowed to reach the public API endpoint. Defaults to the whole internet, which is protected by IAM authentication but should be narrowed to your office or VPN range for production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_log_types" {
  description = "Control plane log types to send to CloudWatch. 'audit' and 'authenticator' are the ones that matter for security investigations."
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "CloudWatch retention for control plane logs."
  type        = number
  default     = 30
}

variable "admin_access_entries" {
  description = "Additional IAM principal ARNs granted cluster-admin through EKS Access Entries. The identity that runs terraform apply is admin automatically."
  type        = list(string)
  default     = []
}

variable "enable_network_policy" {
  description = "Turn on the VPC CNI's NetworkPolicy controller. Required for any NetworkPolicy resource to actually be enforced."
  type        = bool
  default     = true
}

variable "enable_ebs_csi" {
  description = "Install the EBS CSI driver addon plus its IRSA role. Required for any PersistentVolumeClaim, including the Prometheus TSDB."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}
