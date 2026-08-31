/*
 * Cluster stack: everything AWS has to create before Kubernetes exists.
 *
 *   VPC + subnets  ->  EKS control plane + node group
 *   ECR repositories
 *   GitHub Actions OIDC identity
 *
 * Apply this first. Then `platform/` installs the in-cluster components, and
 * after that nothing about the application is a Terraform concern - ArgoCD takes
 * over and a commit in k8s/overlays/dev is what changes the running app.
 *
 * Why this is a separate state from platform/: the helm and kubernetes providers
 * need a cluster endpoint that does not exist until this stack has applied.
 * Configuring a provider from a resource created in the same apply is the classic
 * Terraform failure ("provider configuration ... depends on resource attributes
 * that cannot be determined until apply"). Two states applied in order removes
 * the problem instead of working around it with -target.
 */

locals {
  cluster_name = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------
module "vpc" {
  source = "../modules/vpc"

  name         = local.cluster_name
  cidr_block   = var.vpc_cidr
  az_count     = var.az_count
  cluster_name = local.cluster_name

  single_nat_gateway = var.single_nat_gateway
  enable_flow_logs   = var.enable_flow_logs
}

# ---------------------------------------------------------------------------
# Kubernetes control plane and workers
# ---------------------------------------------------------------------------
module "eks" {
  source = "../modules/eks"

  cluster_name       = local.cluster_name
  kubernetes_version = var.kubernetes_version

  vpc_id = module.vpc.vpc_id

  # Nodes and control plane ENIs go in private subnets only. The public subnets
  # exist for the ALB and the NAT Gateway, nothing else.
  private_subnet_ids = module.vpc.private_subnet_ids

  node_instance_type = var.node_instance_type
  node_capacity_type = var.node_capacity_type
  desired_nodes      = var.desired_nodes
  min_nodes          = var.min_nodes
  max_nodes          = var.max_nodes

  endpoint_public_access_cidrs = var.endpoint_public_access_cidrs
  admin_access_entries         = var.admin_access_entries

  # Prometheus and Grafana both want PersistentVolumeClaims.
  enable_ebs_csi = true

  # This project ships no NetworkPolicy manifests, so the CNI's policy controller
  # would be a daemon enforcing an empty ruleset. Turn it on the same day you
  # write your first NetworkPolicy - shipping policies without it is worse than
  # either, because the objects exist and are silently not enforced.
  enable_network_policy = false
}

# ---------------------------------------------------------------------------
# Container registries
#
# One repository per image. Tags are immutable (see modules/ecr), which is what
# makes a Git SHA tag a permanent, unambiguous reference to a specific set of
# bytes - and therefore what makes rollback deterministic.
# ---------------------------------------------------------------------------
module "ecr_backend" {
  source = "../modules/ecr"

  repository_name      = "${var.project_name}-backend"
  keep_last_images     = var.ecr_keep_last_images
  untagged_expiry_days = var.ecr_untagged_expiry_days

  tags = { Component = "backend" }
}

module "ecr_frontend" {
  source = "../modules/ecr"

  repository_name      = "${var.project_name}-frontend"
  keep_last_images     = var.ecr_keep_last_images
  untagged_expiry_days = var.ecr_untagged_expiry_days

  tags = { Component = "frontend" }
}

# ---------------------------------------------------------------------------
# GitHub Actions identity
#
# One role, trusted only from the main branch of one repository. The workflow
# exchanges a short-lived GitHub OIDC token for temporary AWS credentials; no
# AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY exists anywhere in GitHub.
#
# The role can push to these two ECR repositories and is explicitly denied eks:*.
# That denial is the architecture stated in IAM: CI publishes artifacts, it does
# not deploy. Even a compromised workflow cannot reach the cluster.
# ---------------------------------------------------------------------------
module "github_oidc" {
  source = "../modules/iam-github-oidc"

  github_repository = var.github_repository
  role_name         = "${var.project_name}-gha-${var.environment}"
  environment       = var.environment

  # deploy.yml runs on push to main. No GitHub Environment is involved, and no
  # wildcard: a feature branch or a fork cannot assume this role.
  allowed_branches     = ["main"]
  allowed_environments = []

  ecr_repository_arns = [
    module.ecr_backend.repository_arn,
    module.ecr_frontend.repository_arn,
  ]

  create_oidc_provider = true
}
