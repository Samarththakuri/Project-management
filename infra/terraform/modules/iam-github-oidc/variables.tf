variable "github_repository" {
  description = "Repository in owner/name form, e.g. Samarththakuri/Project-management. This is baked into the trust policy, so only workflows in this repository can assume the role."
  type        = string

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repository))
    error_message = "github_repository must be in owner/name form."
  }
}

variable "role_name" {
  description = "IAM role name."
  type        = string
}

variable "environment" {
  description = "Environment this role serves (dev, staging, prod). Used in naming and tagging."
  type        = string
}

variable "allowed_environments" {
  description = "GitHub Environment names permitted to assume this role. Combined with GitHub's own environment protection rules, this is what stops a dev workflow from touching production."
  type        = list(string)
  default     = []
}

variable "allowed_branches" {
  description = "Branch names permitted to assume this role. Keep this empty for staging and prod so that only an environment-scoped job qualifies."
  type        = list(string)
  default     = []
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs this role may push to. Passed from the ecr module's output so the two can never drift apart."
  type        = list(string)
}

variable "create_oidc_provider" {
  description = "Create the account-level GitHub OIDC provider. Exactly one stack in the account should do this."
  type        = bool
  default     = false
}

variable "existing_oidc_provider_arn" {
  description = "ARN of an existing GitHub OIDC provider, when create_oidc_provider is false."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default     = {}
}
