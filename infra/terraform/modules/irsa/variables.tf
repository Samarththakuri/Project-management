variable "name" {
  description = "IAM role name."
  type        = string
}

variable "description" {
  description = "IAM role description."
  type        = string
  default     = "IRSA role"
}

variable "oidc_provider_arn" {
  description = "ARN of the cluster's IAM OIDC identity provider."
  type        = string
}

variable "oidc_provider_url" {
  description = "OIDC issuer host and path with no scheme, e.g. oidc.eks.eu-west-1.amazonaws.com/id/ABC123. Used to build the aud and sub condition keys."
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace the ServiceAccount lives in."
  type        = string
}

variable "service_accounts" {
  description = "ServiceAccount names permitted to assume this role."
  type        = list(string)
}

variable "policy_arns" {
  description = "Existing managed policy ARNs to attach."
  type        = list(string)
  default     = []
}

variable "inline_policy_json" {
  description = "Optional customer-managed policy document to create and attach."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default     = {}
}
