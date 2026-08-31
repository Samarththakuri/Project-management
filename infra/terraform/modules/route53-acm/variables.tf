variable "project_name" {
  description = "Project name, used in resource comments and tags."
  type        = string
}

variable "domain_name" {
  description = "Registered domain that owns the hosted zone, e.g. example.com. There is deliberately no default: nothing about this pipeline hardcodes a production domain."
  type        = string
}

variable "subdomain" {
  description = "Host label for this environment, e.g. dev or staging. Empty string serves the apex."
  type        = string
  default     = ""
}

variable "subject_alternative_names" {
  description = "Extra names on the certificate, e.g. [\"www.example.com\"]."
  type        = list(string)
  default     = []
}

variable "create_hosted_zone" {
  description = "Create the public hosted zone. Set false when the domain is already hosted in this account and should just be looked up. If true, remember to point the registrar at the zone's nameservers."
  type        = bool
  default     = true
}

variable "create_dns_record" {
  description = "Create the alias record. Leave false on the first apply: the ALB does not exist until ArgoCD has synced the Ingress. Flip to true and apply again afterwards."
  type        = bool
  default     = false
}

variable "cluster_name" {
  description = "EKS cluster name, matched against the elbv2.k8s.aws/cluster tag when locating the ALB."
  type        = string
}

variable "ingress_namespace" {
  description = "Namespace of the Ingress that creates the ALB, e.g. projectcamp-dev. Must match the namespace the Kustomize overlay deploys into."
  type        = string
}

variable "ingress_name" {
  description = "Name of the Ingress that creates the ALB, after any namePrefix the overlay applies, e.g. dev-projectcamp."
  type        = string
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default     = {}
}
