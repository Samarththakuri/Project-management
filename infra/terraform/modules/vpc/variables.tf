variable "name" {
  description = "Name prefix for all VPC resources, e.g. projectcamp-dev."
  type        = string
}

variable "cidr_block" {
  description = "IPv4 CIDR for the VPC. A /16 gives room for the /18 private subnets the VPC CNI needs, since every pod consumes a real VPC IP address."
  type        = string

  validation {
    condition     = can(cidrnetmask(var.cidr_block)) && tonumber(split("/", var.cidr_block)[1]) <= 16
    error_message = "cidr_block must be a valid CIDR of /16 or larger."
  }
}

variable "az_count" {
  description = "Number of Availability Zones to spread across. Three is the minimum for a control plane that survives a single-AZ failure without losing quorum."
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "az_count must be between 2 and 4."
  }
}

variable "cluster_name" {
  description = "EKS cluster name. Used for the kubernetes.io/cluster/<name> subnet tags that let the AWS Load Balancer Controller discover which subnets belong to this cluster."
  type        = string
}

variable "single_nat_gateway" {
  description = "Route all private subnets through one NAT Gateway instead of one per AZ. Saves roughly 32 USD/month per gateway, at the cost of making that AZ a single point of failure for egress. Appropriate for dev, not for production."
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Ship VPC Flow Logs to CloudWatch. Valuable for security forensics and for debugging why a pod cannot reach something; costs money per GB ingested."
  type        = bool
  default     = false
}

variable "flow_log_retention_days" {
  description = "CloudWatch retention for flow logs."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}
