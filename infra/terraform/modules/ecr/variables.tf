variable "repository_name" {
  description = "ECR repository name. Must match what CI pushes to and what the GitOps kustomization references, e.g. projectcamp-backend."
  type        = string
}

variable "kms_key_arn" {
  description = "Customer-managed KMS key for at-rest encryption. Null uses the AES256 default, which is still encrypted, just with an AWS-owned key."
  type        = string
  default     = null
}

variable "keep_last_images" {
  description = "How many images to retain before expiring the oldest."
  type        = number
  default     = 30
}

variable "untagged_expiry_days" {
  description = "Days before an untagged image is expired."
  type        = number
  default     = 7
}

variable "cross_account_pull_arns" {
  description = "Principal ARNs from other AWS accounts allowed to pull. Leave empty for a single-account setup so that no repository policy is created at all."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to the repository."
  type        = map(string)
  default     = {}
}
